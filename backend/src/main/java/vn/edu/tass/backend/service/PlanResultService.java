package vn.edu.tass.backend.service;

import java.security.Principal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import vn.edu.tass.backend.exception.*;
import vn.edu.tass.backend.payload.dto.PlanResultDto.*;
import vn.edu.tass.backend.payload.dto.PlanVersionDto;
import vn.edu.tass.backend.repository.*;
import vn.edu.tass.backend.solver.PlanValidationEvaluator;
import vn.edu.tass.solver.Json;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class PlanResultService {
    private final PlanActorResolver actors;
    private final AssignmentPlanRepository plans;
    private final WorkloadSourceRepository sources;
    private final PlanResultRepository results;
    private final PlanValidationEvaluator evaluator;
    private final SolverRunRepository runs;
    private final SolverInputRepository inputs;
    public PlanResultService(PlanActorResolver actors,AssignmentPlanRepository plans,WorkloadSourceRepository sources,PlanResultRepository results,
            PlanValidationEvaluator evaluator,SolverRunRepository runs,SolverInputRepository inputs) {
        this.actors=actors; this.plans=plans; this.sources=sources; this.results=results; this.evaluator=evaluator; this.runs=runs; this.inputs=inputs;
    }
    public AssignmentPage assignments(long id,Long teacher,Long classroom,String type,Boolean locked,Boolean unassigned,LocalDate date,int limit,int offset,Principal principal) {
        var v=authorized(id,principal); page(limit,offset); positive(teacher); positive(classroom);
        if(type!=null&&!Set.of("STANDARD","SPECIALIZED_TOPIC","ENRICHMENT").contains(type)) throw new BadRequestException("demand_type không hợp lệ.");
        var all=rows(v).stream().filter(a->teacher==null||Objects.equals(teacher,a.teacherId())).filter(a->classroom==null||classroom==a.classId())
            .filter(a->type==null||type.equals(a.demandType())).filter(a->locked==null||locked==a.locked())
            .filter(a->unassigned==null||unassigned==(a.teacherId()==null)).filter(a->date==null||a.validFrom()!=null&&!date.isBefore(a.validFrom())&&!date.isAfter(a.validTo())).toList();
        return new AssignmentPage(context(v),all.size(),limit,offset,slice(all,limit,offset));
    }
    public WorkloadPage workloads(long id,Long teacher,int limit,int offset,Principal principal) {
        var v=authorized(id,principal); page(limit,offset); positive(teacher);
        var evaluated=evaluator.evaluate(source(v),v,rows(v));
        var all=evaluated.workloads().stream().filter(w->teacher==null||teacher==w.teacherId()).toList();
        var warnings=new ArrayList<>(evaluated.warnings()); if(!v.snapshotFresh()) warnings.add("SNAPSHOT_STALE: values use the captured source, not current live records");
        return new WorkloadPage(context(v),all.size(),limit,offset,slice(all,limit,offset),evaluated.coverage(),evaluated.status(),warnings);
    }
    public OptimizationView optimization(long id,Principal principal) {
        var v=authorized(id,principal); Long latest=results.latestRun(id,false),chosen=results.latestRun(id,true);
        if(chosen==null) chosen=latest;
        if(chosen==null) return new OptimizationView(context(v),null,null,false,null,null,List.of("NO_SOLVER_RUN"));
        var run=runs.read(chosen).orElseThrow(); var archived=inputs.read(chosen).orElseThrow();
        var canonical=archived.canonical()==null?null:PlanValidationEvaluator.parse(archived.canonical());
        var config=canonical==null?null:Json.MAPPER.createObjectNode();
        if(config!=null) canonical.path("config").fields().forEachRemaining(e->((com.fasterxml.jackson.databind.node.ObjectNode)config)
            .set(new com.fasterxml.jackson.databind.PropertyNamingStrategies.SnakeCaseStrategy().translate(e.getKey()),e.getValue()));
        boolean matches=Objects.equals(run.appliedRevisionNo(),v.revisionNo()) && archived.snapshotId()==v.inputSnapshotId()
            && archived.token().equals(v.liveSourceRevisionToken()) && v.isCurrent() && run.summary()!=null && run.summary().path("apply_outcome").asText().equals("APPLIED");
        var vector=run.summary()==null?null:run.summary().path("coverage").path("metrics").path("objectiveVector");
        List<String> warnings=new ArrayList<>(); var result=results.result(chosen); if(result!=null) result.path("warnings").forEach(w->warnings.add(w.asText()));
        if(!matches) warnings.add("OPTIMIZATION_STALE_OR_NOT_APPLIED: proof/objectives describe this run, not the current saved assignments");
        return new OptimizationView(context(v),latest,run,matches,config,vector,warnings);
    }
    @Transactional
    public ValidationReport validate(long id,long expectedRevision,Principal principal) {
        long actor=actors.requireActor(principal); var initial=authorized(id,principal);
        plans.lockPlan(initial.planId()); plans.lockVersion(id); plans.lockRound(initial.roundId());
        var v=authorized(id,principal);
        if(!v.isCurrent()) throw conflict("CURRENT_VERSION_REQUIRED","Chỉ kiểm tra và lưu validation cho current version.");
        if(expectedRevision<0||v.revisionNo()!=expectedRevision) throw conflict("REVISION_CONFLICT","Revision đã đổi; đọc lại version.");
        if(!v.snapshotFresh()) throw conflict("STALE_INPUT","Nguồn đã đổi; refresh snapshot trước khi lưu validation.");
        var evaluated=evaluator.evaluate(source(v),v,rows(v));
        long run=results.save(v,actor,evaluated);
        return results.validation(id,run).orElseThrow();
    }
    public ValidationReport validation(long id,Long run,Principal principal) {
        authorized(id,principal); positive(run);
        return results.validation(id,run).orElseThrow(()->new NotFoundException("Chưa có validation cho version hoặc ID này."));
    }
    private PlanVersionDto authorized(long id,Principal principal) {
        long actor=actors.requireActor(principal); if(id<=0) throw new BadRequestException("ID phải dương.");
        var v=plans.version(id).orElseThrow(()->new NotFoundException("Không tìm thấy version."));
        if(!plans.canManage(actor,v.roundId())) throw new PlanOperationException(HttpStatus.FORBIDDEN,"PLAN_ACCESS_DENIED","Không có quyền quản lý toàn bộ phạm vi đợt.");
        return v;
    }
    private WorkloadSourceRepository.Captured source(PlanVersionDto v) { return sources.read(v.inputSnapshotId()).orElseThrow(()->new NotFoundException("Không tìm thấy snapshot.")); }
    private List<AssignmentRow> rows(PlanVersionDto v) { return results.assignments(v.versionId(),PlanValidationEvaluator.parse(source(v).payload())); }
    private static VersionContext context(PlanVersionDto v) { return new VersionContext(v.versionId(),v.revisionNo(),v.inputSnapshotId(),v.sourceRevisionToken(),v.snapshotFresh(),v.isCurrent()); }
    private static void positive(Long id) { if(id!=null&&id<=0) throw new BadRequestException("ID bộ lọc phải dương."); }
    private static void page(int limit,int offset) { if(limit<1||limit>200||offset<0) throw new BadRequestException("limit từ 1..200, offset không âm."); }
    private static <T> List<T> slice(List<T> all,int limit,int offset) { int start=Math.min(offset,all.size()); return all.subList(start,start+Math.min(limit,all.size()-start)); }
    private static PlanOperationException conflict(String code,String message) { return new PlanOperationException(HttpStatus.CONFLICT,code,message); }
}
