package vn.edu.tass.backend.solver;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.stereotype.Component;
import vn.edu.tass.backend.repository.WorkloadSourceRepository;
import vn.edu.tass.solver.Contract;
import vn.edu.tass.solver.ExperienceScoring;
import vn.edu.tass.solver.Json;
import static vn.edu.tass.backend.solver.CapturedWorkloadData.*;
import static vn.edu.tass.backend.solver.WorkloadInputException.require;

/** Immutable DB source -> shared workload/rule inputs. No live source lookups or HTTP input. */
@Component
public class DbWorkloadPreparer {
    public record TeacherInput(long id,String name,Contract.Workload workload,
        List<Contract.Employment> employments,List<Contract.Qualification> qualifications,
        Map<String,Long> experiencePenalties,List<Contract.HardCheck> hardChecks) {
        public TeacherInput {
            employments=List.copyOf(employments); qualifications=List.copyOf(qualifications);
            experiencePenalties=Collections.unmodifiableMap(new TreeMap<>(experiencePenalties)); hardChecks=List.copyOf(hardChecks);
        }
    }
    public record Prepared(long snapshotId,long roundId,Contract.Period period,long integerScale,
        Map<Long,TeacherInput> teachers,List<Contract.Precheck> prechecks,List<String> warnings) {
        public Prepared {
            teachers=Collections.unmodifiableMap(new TreeMap<>(teachers)); prechecks=List.copyOf(prechecks); warnings=List.copyOf(warnings);
        }
        public boolean rulesReady() { return prechecks.stream().allMatch(p->p.status()==Contract.CheckStatus.PASS || p.status()==Contract.CheckStatus.NOT_APPLICABLE); }
    }
    private record Credit(String table,JsonNode row,String key) {}
    private final WorkloadSourceRepository source;
    public DbWorkloadPreparer(WorkloadSourceRepository source) { this.source=source; }

    public Prepared prepare(long snapshotId) {
        var captured=source.read(snapshotId).orElseThrow(()->new WorkloadInputException("SNAPSHOT_NOT_FOUND","input_snapshot#"+snapshotId,"Snapshot not found"));
        JsonNode root;
        try { root=Json.MAPPER.reader().with(com.fasterxml.jackson.databind.DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readTree(captured.payload()); }
        catch (java.io.IOException e) { throw new WorkloadInputException("INVALID_DB_SNAPSHOT","input_snapshot#"+snapshotId,"Invalid JSON payload"); }
        require(root.path("schema_version").asInt(-1)==2 && id(root.path("round"),"id")==captured.roundId()
            && id(root.path("rule_set"),"id")==captured.rulesId() && id(root.path("optimization_config"),"id")==captured.configId()
            && captured.token().equals(text(root,"source_revision_token")),"SNAPSHOT_IDENTITY_MISMATCH","input_snapshot#"+snapshotId,"Captured identities differ");
        var demands=index(root,"demands");
        require(!demands.isEmpty(),"NO_ACTIVE_DEMANDS","demands","At least one demand required");
        LocalDate start=date(demands.values().iterator().next(),"valid_from"),end=end(demands.values().iterator().next(),null);
        require(end!=null && !end.isBefore(start),"INVALID_SOURCE_DATE","demands","Invalid effective interval");
        long semester=id(root.path("semester"),"id"),school=id(root.path("school"),"id");
        for (var d:demands.values()) {
            require(date(d,"valid_from").equals(start) && date(d,"valid_to").equals(end),"UNSUPPORTED_EFFECTIVE_INTERVALS",ref("teaching_demand",d),"A solve requires one uniform interval");
            require(id(d,"semester_id")==semester && "ACTIVE".equals(text(d,"status")) && "PERIOD_PER_WEEK".equals(text(d,"unit")),"INVALID_DEMAND_CONTEXT",ref("teaching_demand",d),"Wrong semester/status/unit");
            var h=number(d,"periods_per_week");
            require(h.signum()>0 && h.compareTo(new BigDecimal("999.99"))<=0 && h.stripTrailingZeros().scale()<=2,"INVALID_DEMAND_LOAD",ref("teaching_demand",d),"Demand precision/range invalid; no rounding");
        }
        var config=root.path("optimization_config");
        id(config,"confirmed_by"); OffsetDateTime.parse(text(config,"confirmed_at"));
        var cfg=config.path("criteria_weights_json");
        var workloadPolicy=cfg.path("workload_policy");
        require("ILLUSTRATIVE_MVP_V1".equals(text(workloadPolicy,"rule_evaluator")),"UNSUPPORTED_RULE_HANDLER","workload_policy","No implemented evaluator selected");
        Set<String> eligiblePositions=new HashSet<>();
        for (var position:rows(workloadPolicy,"eligible_position_codes")) {
            require(position.isTextual() && !position.textValue().isBlank(),"INVALID_POSITION_POLICY","workload_policy","Explicit position codes required");
            eligiblePositions.add(position.textValue());
        }
        require(!eligiblePositions.isEmpty(),"INVALID_POSITION_POLICY","workload_policy","At least one supported position required");
        var limits=cfg.path("hard_limits");
        String basis=text(limits,"basis");
        require(Set.of("T","W").contains(basis),"UNSUPPORTED_WEEKLY_BASIS","hard_limits.basis","Explicit T or W basis required");
        BigDecimal weeklyLimit=number(limits,"max_total_weekly"); WorkloadMath.nonnegative(weeklyLimit,"weekly limit");
        String limitSource=text(limits,"source");
        boolean demo=cfg.path("demo_only").asBoolean(false);
        var rules=index(root,"rules");
        var ruleset=root.path("rule_set");
        id(ruleset,"confirmed_by"); OffsetDateTime.parse(text(ruleset,"confirmed_at"));
        require(covers(ruleset,start,end),"RULE_EFFECTIVITY_GAP","rule_set","Rule set must cover the whole interval");
        var context=root.path("school_context"); verified(context,null,null,"evidence_ref");
        require(text(context,"institution_type").equals(text(ruleset,"institution_type")),"RULE_INSTITUTION_MISMATCH","school_context","Do not mix institutional rule sets");
        var periods=rows(root,"calculation_periods").stream().filter(p->!date(p,"starts_on").isAfter(end) && !date(p,"ends_on").isBefore(start)).toList();
        require(periods.size()==1 && !date(periods.get(0),"starts_on").isAfter(start) && !date(periods.get(0),"ends_on").isBefore(end),"UNSUPPORTED_CALCULATION_PERIODS","calculation_periods","One covering calculation period required");
        long period=id(periods.get(0),"id");
        var classes=index(root,"classes"); var grades=index(root,"grades"); var levels=index(root,"education_levels");
        var experiencePolicy=experiencePolicy(cfg,config);
        LocalDate experienceDate=date(cfg.path("experience"),"as_of_date");
        Map<Long,TeacherInput> prepared=new TreeMap<>();
        List<BigDecimal> scaleValues=new ArrayList<>(List.of(weeklyLimit));
        List<String> warnings=new ArrayList<>();
        int reductionCount=0,conversionCount=0;
        for (var teacher:index(root,"teachers").values()) {
            long tid=id(teacher,"id"); String teacherRef=ref("teacher",teacher);
            require(id(teacher,"school_id")==school,"TEACHER_SCHOOL_MISMATCH",teacherRef,"Teacher belongs to another school");
            var jobs=rows(root,"employment").stream().filter(e->id(e,"teacher_id")==tid && id(e,"semester_id")==semester && overlaps(e,start,end)).toList();
            require(jobs.size()==1 && covers(jobs.get(0),start,end),"UNSUPPORTED_EMPLOYMENT_INTERVAL",teacherRef,"Exactly one full-interval employment/leave record required");
            var job=jobs.get(0); String employment=text(job,"employment_status");
            require(Set.of("TEACHING","ON_LEAVE","INACTIVE").contains(employment),"INVALID_EMPLOYMENT_STATUS",teacherRef,"Unknown employment status");
            boolean target=employment.equals("TEACHING") && eligiblePositions.contains(text(job,"position_code"));
            var bases=rows(root,"workload_basis").stream().filter(b->id(b,"teacher_id")==tid && id(b,"semester_id")==semester && covers(b,start,end)
                && "VERIFIED".equals(b.path("verification_status").asText()) && text(b,"position_code").equals(text(job,"position_code"))).toList();
            require(bases.size()==1,"WORKLOAD_BASIS_MISSING_OR_AMBIGUOUS",teacherRef,"One confirmed full-interval baseline required");
            var baseline=bases.get(0); verified(baseline,"verified_by","verified_at","profile_ref");
            require("PERIOD_PER_WEEK".equals(text(baseline,"unit")),"UNSUPPORTED_BASELINE_UNIT",teacherRef,"Baseline must use weekly periods");
            BigDecimal b=number(baseline,"base_periods_per_week");
            require(b.signum()>0,"INVALID_BASELINE",teacherRef,"Positive baseline required");
            var baseRule=rule(rules,id(baseline,"rule_definition_id"),captured.rulesId(),start,end,demo);
            String levelCode=text(required(levels,id(baseline,"education_level_id"),"education_levels"),"level_code");
            JsonNode expected=baseRule.path("value_and_unit_json").path(levelCode);
            if (!expected.isNumber()) expected=baseRule.path("value_and_unit_json").path("value");
            require(expected.isNumber() && expected.decimalValue().compareTo(b)==0 && "PERIOD_PER_WEEK".equals(text(baseRule.path("value_and_unit_json"),"unit")),"BASELINE_RULE_MISMATCH",teacherRef,"Baseline differs from selected source rule");
            var weekly=rows(root,"period_workloads").stream().filter(w->id(w,"teacher_id")==tid && id(w,"calculation_period_id")==period).toList();
            require(weekly.size()==1,"WEEKLY_INPUT_MISSING",teacherRef,"One selected outside-scope weekly source required");
            var outside=weekly.get(0); verified(outside,null,null,"evidence_ref");
            require("OUTSIDE_SCOPE_WEEKLY".equals(text(outside,"record_type")) && outside.path("source_version_id").isNull(),"AMBIGUOUS_OUTSIDE_LOAD",teacherRef,"F must be an independent outside-scope source, not a plan total");
            BigDecimal f=number(outside,"teaching_periods"); WorkloadMath.nonnegative(f,"F");
            var inventory=outside.path("input_confirmation_json");
            require(inventory.isObject() && inventory.path("contract_version").asInt(-1)==1 && id(inventory,"round_id")==captured.roundId(),"WORKLOAD_INVENTORY_UNCONFIRMED",teacherRef,"Explicit input inventory for this round required, including empty inventories");
            id(outside,"input_confirmed_by"); OffsetDateTime.parse(text(outside,"input_confirmed_at")); text(inventory,"evidence_ref");
            require(ids(inventory,"in_scope_demand_ids").equals(demands.keySet()),"WORKLOAD_INVENTORY_STALE",teacherRef,"Inventory scope differs from captured demands");
            var outsideIds=ids(inventory,"outside_demand_ids");
            require(Collections.disjoint(outsideIds,demands.keySet()),"OUTSIDE_LOAD_OVERLAP",teacherRef,"F overlaps A, including locked demands");
            List<Credit> reductions=new ArrayList<>();
            for (String table:List.of("duties","reductions")) for (var item:rows(root,table)) {
                if (id(item,"teacher_id")==tid && id(item,"semester_id")==semester && overlaps(item,start,end)) {
                    require(covers(item,start,end),"UNSUPPORTED_REDUCTION_INTERVAL",ref(table,item),"Reduction must be constant over the entire interval");
                    reductions.add(new Credit(table.equals("duties")?"teacher_duty":"teacher_reduction",item,""));
                }
            }
            var activities=rows(root,"converted_activities").stream().filter(a->id(a,"teacher_id")==tid && id(a,"calculation_period_id")==period && a.path("include_in_workload").asBoolean(false)).map(a->new Credit("converted_activity",a,"")).toList();
            Set<String> itemKeys=new HashSet<>(),evidenceKeys=new HashSet<>();
            var selectedReductions=inventory(reductions,inventory,"reduction_items",itemKeys,teacherRef);
            var selectedActivities=inventory(activities,inventory,"conversion_items",itemKeys,teacherRef);
            BigDecimal r=BigDecimal.ZERO,c=BigDecimal.ZERO;
            for (var credit:selectedReductions) {
                var item=credit.row(); verified(item,"verified_by",null,"evidence_ref");
                duplicateEvidence(item,evidenceKeys,teacherRef);
                var rd=rule(rules,id(item,"rule_definition_id"),captured.rulesId(),start,end,demo);
                BigDecimal value=number(item,"reduction_value"); WorkloadMath.nonnegative(value,"R");
                require(number(rd.path("value_and_unit_json"),"value").compareTo(value)==0 && "PERIOD_PER_WEEK".equals(text(rd.path("value_and_unit_json"),"unit")),"REDUCTION_RULE_MISMATCH",credit.table(),"Reduction differs from selected rule value/unit");
                if (credit.table().equals("teacher_duty") && "HOMEROOM".equals(text(item,"duty_type"))) {
                    var classroom=required(classes,id(item,"class_id"),"classes");
                    require(id(classroom,"academic_year_id")==id(root.path("semester"),"academic_year_id"),"DUTY_CONTEXT_MISMATCH",credit.table(),"Homeroom class belongs to another academic year");
                }
                r=r.add(value);
            }
            for (var credit:selectedActivities) {
                var item=credit.row(); verified(item,"approved_by",null,"evidence_ref");
                duplicateEvidence(item,evidenceKeys,teacherRef);
                var rd=rule(rules,id(item,"rule_definition_id"),captured.rulesId(),start,end,demo);
                var values=rd.path("value_and_unit_json");
                require("PERIOD_PER_WEEK".equals(text(item,"original_unit")) && "PERIOD_PER_WEEK".equals(text(values,"unit")),"UNSUPPORTED_CONVERSION_UNIT",credit.table(),"No implicit hours/annual-to-weekly conversion");
                BigDecimal quantity=number(item,"quantity"),factor=number(item,"approved_factor");
                require(quantity.signum()>0 && factor.signum()>=0 && factor.compareTo(number(values,"factor"))==0,"CONVERSION_FACTOR_MISMATCH",credit.table(),"Use the approved factor, not a maximum/default");
                if (values.hasNonNull("max_factor")) require(factor.compareTo(number(values,"max_factor"))<=0,"CONVERSION_CAP_EXCEEDED",credit.table(),"Approved factor exceeds its cap");
                BigDecimal converted=quantity.multiply(factor);
                require(converted.compareTo(number(item,"converted_periods"))==0,"CONVERSION_TOTAL_MISMATCH",credit.table(),"Stored conversion must match exact quantity times approved factor; no rounding");
                c=c.add(converted);
            }
            reductionCount+=selectedReductions.size(); conversionCount+=selectedActivities.size();
            String provenance=ref("teacher_workload_basis",baseline)+"; "+ref("teacher_period_workload",outside)+"; "+text(inventory,"evidence_ref");
            var workload=new Contract.Workload(b,r,f,c,target,provenance,text(baseline,"profile_ref"),outsideIds.stream().map(String::valueOf).toList());
            var qualifications=qualifications(root,tid,start,end);
            Map<String,Long> penalties=new TreeMap<>();
            if (target) for (var d:demands.values()) {
                var classroom=required(classes,id(d,"class_id"),"classes");
                var grade=required(grades,id(classroom,"grade_id"),"grades");
                boolean eligible=qualifications.stream().anyMatch(q->q.subjectId().equals(Long.toString(id(d,"subject_id"))) && q.levelId().equals(Long.toString(id(grade,"education_level_id"))));
                if (eligible) penalties.put(Long.toString(id(d,"id")),experience(root,tid,id(d,"subject_id"),id(classroom,"grade_id"),experienceDate,experiencePolicy));
            }
            Map<String,BigDecimal> coefficients=new TreeMap<>();
            demands.values().forEach(d->coefficients.put(Long.toString(id(d,"id")),number(d,"periods_per_week")));
            BigDecimal fixed=f.add(basis.equals("T")?r:BigDecimal.ZERO);
            require(fixed.add(c).compareTo(weeklyLimit)<=0,"FIXED_LOAD_EXCEEDS_LIMIT",teacherRef,"Fixed confirmed load already exceeds the selected hard limit");
            var weeklyCheck=new Contract.HardCheck("WEEKLY:"+period+":"+basis,"BR-06",Contract.CheckPeriod.WEEKLY,"WEEKLY:"+start+"/"+end,"PERIODS_PER_WEEK",Contract.CheckStatus.PASS,fixed,c,coefficients,weeklyLimit,List.of(),"optimization_config#"+captured.configId()+" basis="+basis+"; "+limitSource+"; "+provenance);
            var annualCheck=new Contract.HardCheck("ANNUAL","BR-09",Contract.CheckPeriod.ANNUAL,"ACADEMIC_YEAR:"+id(root.path("academic_year"),"id"),"UNRESOLVED_ANNUAL_UNIT",Contract.CheckStatus.INSUFFICIENT_DATA,null,null,Map.of(),null,List.of("annual_actual_workload","approved_annual_unit_conversion","confirmed_annual_limit"),"Annual inputs are not established by a weekly inventory; no zero substitution");
            List<Contract.Employment> employmentRows=employment.equals("INACTIVE") || (employment.equals("TEACHING") && !target)?List.of():List.of(new Contract.Employment(Long.toString(school),Long.toString(semester),start,end,target?Contract.EmploymentStatus.ACTIVE:Contract.EmploymentStatus.FULL_TERM_LEAVE,ref("teacher_employment",job)));
            prepared.put(tid,new TeacherInput(tid,text(teacher,"full_name"),workload,employmentRows,qualifications,penalties,List.of(weeklyCheck,annualCheck)));
            scaleValues.addAll(List.of(b,r,f,c,fixed));
        }
        demands.values().forEach(d->scaleValues.add(number(d,"periods_per_week")));
        String ruleSource="rule_set_version#"+captured.rulesId()+"; optimization_config#"+captured.configId()+"; school_context#"+id(context,"id");
        List<Contract.Precheck> prechecks=new ArrayList<>();
        prechecks.add(new Contract.Precheck("BR-04",Contract.CheckStatus.PASS,ruleSource,"Baseline values, position, evidence and exact units checked against selected source rules."));
        prechecks.add(new Contract.Precheck("BR-16",reductionCount==0?Contract.CheckStatus.NOT_APPLICABLE:Contract.CheckStatus.PASS,ruleSource,"Complete confirmed source inventories checked; each reduction counted once; homeroom references checked."));
        prechecks.add(new Contract.Precheck("BR-17",Contract.CheckStatus.PASS,ruleSource,"Selected rule set, institutional context, source document/clause/reference and whole-interval effectivity checked."));
        for (String br:List.of("BR-18","BR-19")) {
            boolean inactive=demo || (reductionCount==0 && conversionCount==0);
            prechecks.add(new Contract.Precheck(br,inactive?Contract.CheckStatus.NOT_APPLICABLE:Contract.CheckStatus.INSUFFICIENT_DATA,ruleSource,
                inactive?"Full special-regime adjudication is outside the explicitly labelled illustrative MVP; no legal PASS is claimed.":"Special-regime task/payment conditions require an implemented approved rule evaluator."));
        }
        boolean noFunds=rows(root,"funds").isEmpty() && rows(root,"fund_allocations").isEmpty();
        prechecks.add(new Contract.Precheck("BR-20",demo && noFunds?Contract.CheckStatus.NOT_APPLICABLE:Contract.CheckStatus.INSUFFICIENT_DATA,ruleSource,
            demo && noFunds?"No fund inputs in the captured illustrative MVP; fund computation is not enabled.":"School-fund applicability/allocation requires approved rules; do not manufacture PASS."));
        prechecks.add(new Contract.Precheck("BR-21",conversionCount==0?Contract.CheckStatus.NOT_APPLICABLE:Contract.CheckStatus.PASS,ruleSource,"Confirmed conversion inventory checked with exact approved factors, caps, units and no duplicate source items."));
        if (demo) warnings.add("DEMO_RULES: illustrative, confirmed source inputs; not legal regime certification.");
        warnings.add("ANNUAL_INPUTS_MISSING: weekly evidence does not establish annual workload, conversion or limits.");
        return new Prepared(snapshotId,captured.roundId(),new Contract.Period(start,end),scale(scaleValues),prepared,prechecks,warnings);
    }

    private static JsonNode required(Map<Long,JsonNode> rows,long id,String source) {
        var value=rows.get(id); require(value!=null,"MISSING_SOURCE_REFERENCE",source,"Referenced row not captured: "+id); return value;
    }
    private static JsonNode rule(Map<Long,JsonNode> rules,long key,long ruleset,LocalDate start,LocalDate end,boolean demo) {
        var r=required(rules,key,"rules");
        require(id(r,"rule_set_version_id")==ruleset && covers(r,start,end),"RULE_SOURCE_MISMATCH",ref("rule_definition",r),"Wrong rule set or effective interval");
        text(r,"source_document"); text(r,"source_clause"); text(r,"source_ref");
        require(demo && "DEMO".equals(text(r,"rule_type")) && r.path("conditions_json").path("demo_only").asBoolean(false),
            "UNSUPPORTED_RULE_HANDLER",ref("rule_definition",r),"Only the explicit illustrative rule contract has an implemented evaluator; production rules require a handler");
        return r;
    }
    private static List<Credit> inventory(List<Credit> actual,JsonNode inventory,String key,Set<String> keys,String source) {
        Map<String,Credit> expected=new TreeMap<>();
        for (var c:actual) require(expected.put(c.table()+"#"+id(c.row(),"id"),c)==null,"DUPLICATE_WORKLOAD_ITEM",source,"Repeated source row");
        List<Credit> result=new ArrayList<>(); Set<String> seen=new HashSet<>();
        for (var entry:rows(inventory,key)) {
            String ref=text(entry,"source_table")+"#"+id(entry,"source_id"),itemKey=text(entry,"item_key");
            require(seen.add(ref) && keys.add(itemKey),"DUPLICATE_WORKLOAD_ITEM",source,"Source/item repeated within or across C and R: "+ref);
            var item=expected.get(ref); require(item!=null,"WORKLOAD_INVENTORY_STALE",source,"Inventory contains an absent/out-of-context item: "+ref);
            result.add(new Credit(item.table(),item.row(),itemKey));
        }
        require(seen.equals(expected.keySet()),"WORKLOAD_INVENTORY_STALE",source,"Inventory omits captured applicable source items");
        return List.copyOf(result);
    }
    private static void duplicateEvidence(JsonNode item,Set<String> evidence,String source) {
        String key=id(item,"rule_definition_id")+"/"+text(item,"evidence_ref");
        require(evidence.add(key),"DUPLICATE_WORKLOAD_EVIDENCE",source,"Ambiguous duplicate rule/evidence across C/R sources");
    }
    private static List<Contract.Qualification> qualifications(JsonNode root,long teacher,LocalDate start,LocalDate end) {
        Map<String,List<JsonNode>> groups=new TreeMap<>();
        for (var q:rows(root,"qualifications")) if (id(q,"teacher_id")==teacher && "VERIFIED".equals(q.path("verification_status").asText()) && overlaps(q,start,end)) {
            verified(q,"verified_by","verified_at","evidence_ref");
            groups.computeIfAbsent(id(q,"subject_id")+"/"+id(q,"education_level_id"),k->new ArrayList<>()).add(q);
        }
        List<Contract.Qualification> result=new ArrayList<>();
        for (var group:groups.values()) {
            group.sort(Comparator.<JsonNode,LocalDate>comparing(q->date(q,"valid_from")).thenComparingLong(q->id(q,"id")));
            LocalDate covered=start.minusDays(1); List<String> evidence=new ArrayList<>();
            for (var q:group) {
                if (date(q,"valid_from").isAfter(covered.plusDays(1))) break;
                if (end(q,end).isAfter(covered)) covered=end(q,end);
                evidence.add(ref("teaching_qualification",q)+" "+text(q,"evidence_ref"));
            }
            if (!covered.isBefore(end)) {
                var q=group.get(0);
                result.add(new Contract.Qualification(Long.toString(id(q,"subject_id")),Long.toString(id(q,"education_level_id")),start,end,true,String.join("; ",evidence)));
            }
        }
        return List.copyOf(result);
    }
    private static ExperienceScoring.Policy experiencePolicy(JsonNode cfg,JsonNode config) {
        var p=cfg.path("experience"); List<ExperienceScoring.Band> bands=new ArrayList<>();
        for (var b:rows(p,"penalty_bands")) bands.add(new ExperienceScoring.Band(number(b,"min_years"),nonnegativeLong(b,"penalty")));
        String unknown=text(p,"unknown_policy"); require(Set.of("BLOCK","PENALTY").contains(unknown),"INVALID_EXPERIENCE_POLICY","experience","Expected BLOCK or PENALTY");
        return new ExperienceScoring.Policy(bands,unknown.equals("PENALTY")?nonnegativeLong(p,"unknown_penalty"):null,ref("optimization_config",config));
    }
    private static long nonnegativeLong(JsonNode row,String key) {
        var v=number(row,key); try { long n=v.longValueExact(); require(n>=0,"INVALID_EXPERIENCE_POLICY",key,"Nonnegative integer required"); return n; }
        catch (ArithmeticException e) { throw new WorkloadInputException("INVALID_EXPERIENCE_POLICY",key,"Exact safe integer required"); }
    }
    private static long experience(JsonNode root,long teacher,long subject,long grade,LocalDate asOf,ExperienceScoring.Policy policy) {
        var candidates=rows(root,"experience").stream().filter(e->id(e,"teacher_id")==teacher && id(e,"subject_id")==subject && id(e,"grade_id")==grade && !date(e,"as_of_date").isAfter(asOf))
            .sorted(Comparator.<JsonNode,LocalDate>comparing(e->date(e,"as_of_date")).thenComparingLong(e->id(e,"id")).reversed()).toList();
        ExperienceScoring.Evidence evidence;
        if (candidates.isEmpty()) evidence=new ExperienceScoring.Evidence(ExperienceScoring.Status.UNKNOWN,null,asOf,null);
        else {
            var e=candidates.get(0); ExperienceScoring.Status status;
            try { status=ExperienceScoring.Status.valueOf(text(e,"experience_status")); }
            catch (IllegalArgumentException ex) { throw new WorkloadInputException("INVALID_EXPERIENCE_STATUS","experience","Unknown experience status"); }
            if (status!=ExperienceScoring.Status.UNKNOWN) { id(e,"verified_by"); OffsetDateTime.parse(text(e,"verified_at")); text(e,"evidence_ref"); }
            else require(e.path("years_of_experience").isNull(),"INVALID_EXPERIENCE_STATUS","experience","UNKNOWN cannot contain a years value");
            evidence=new ExperienceScoring.Evidence(status,status==ExperienceScoring.Status.UNKNOWN?null:number(e,"years_of_experience"),date(e,"as_of_date"),status==ExperienceScoring.Status.UNKNOWN?null:ref("teaching_experience",e)+" "+text(e,"evidence_ref"));
        }
        try { return ExperienceScoring.penalty(evidence,asOf,policy); }
        catch (IllegalArgumentException e) { throw new WorkloadInputException("EXPERIENCE_NOT_READY","teacher#"+teacher+"/subject#"+subject+"/grade#"+grade,e.getMessage()); }
    }
    private static long scale(List<BigDecimal> numbers) {
        int digits=2;
        for (var number:numbers) { WorkloadMath.nonnegative(number,"normalization"); digits=Math.max(digits,number.stripTrailingZeros().scale()); }
        require(digits<=6,"UNSUPPORTED_EXACT_SCALE","normalization","Exact scale exceeds supported 10^6; no rounding");
        long scale=BigDecimal.TEN.pow(digits).longValueExact();
        for (var number:numbers) require(number.multiply(BigDecimal.valueOf(scale)).compareTo(new BigDecimal("1000000000000"))<=0,"LOAD_OVERFLOW","normalization","Scaled load exceeds safe integer domain");
        return scale;
    }
}
