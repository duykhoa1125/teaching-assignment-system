package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.edu.tass.backend.payload.dto.RoundReadinessDto;
import vn.edu.tass.backend.payload.request.CreatePlanRequest;
import vn.edu.tass.backend.service.AssignmentPlanService;
import vn.edu.tass.backend.service.RoundReadinessService;
import vn.edu.tass.testing.PlanApiTestConfiguration;

/** Isolated school per case; opt-in on the same disposable seeded DB as the plan tests. */
@EnabledIfSystemProperty(named="plan.integration",matches="true")
@SpringBootTest(classes=PlanApiTestConfiguration.class)
@AutoConfigureMockMvc
class RoundReadinessPostgresTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) { AssignmentPlanPostgresTest.database(properties); }

    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RoundReadinessService readiness;
    @Autowired AssignmentPlanService plans;
    @Autowired PlatformTransactionManager transactions;
    long school,year,semester,actor,teacher,round,scope,applicability,demand,period;
    Principal principal;

    @BeforeEach
    void fixture() {
        String key="RD-"+UUID.randomUUID();
        school=jdbc.queryForObject("INSERT INTO school(school_code,name,status) VALUES(?,'Readiness fixture','ACTIVE') RETURNING id",Long.class,key);
        year=jdbc.queryForObject("INSERT INTO academic_year(school_id,year_code,starts_on,ends_on) VALUES(?,'2026-2027','2026-08-01','2027-07-31') RETURNING id",Long.class,school);
        semester=jdbc.queryForObject("INSERT INTO semester(academic_year_id,semester_no,starts_on,ends_on) VALUES(?,1,'2026-08-01','2026-12-31') RETURNING id",Long.class,year);
        actor=jdbc.queryForObject("INSERT INTO user_account(school_id,login_name,credential_hash,status) VALUES(?,?,'!TEST_NO_PASSWORD!','ACTIVE') RETURNING id",Long.class,school,key);
        principal=()->key;
        jdbc.update("INSERT INTO user_role(user_id,role_id) VALUES(?,1)",actor);
        jdbc.update("INSERT INTO manager_scope(user_id,grade_id,academic_year_id,valid_from,valid_to) VALUES(?,1,?,'2026-08-01','2027-07-31')",actor,year);
        long department=jdbc.queryForObject("INSERT INTO department(school_id,department_code,name,valid_from) VALUES(?,'RD','Readiness department','2026-08-01') RETURNING id",Long.class,school);
        teacher=jdbc.queryForObject("INSERT INTO teacher(school_id,teacher_code,full_name) VALUES(?,'RD','Readiness teacher') RETURNING id",Long.class,school);
        long classroom=jdbc.queryForObject("INSERT INTO school_class(academic_year_id,grade_id,class_code,status) VALUES(?,1,'RD','ACTIVE') RETURNING id",Long.class,year);
        jdbc.update("INSERT INTO teacher_employment(teacher_id,department_id,semester_id,employment_status,position_code,valid_from,valid_to) VALUES(?,?,?,'TEACHING','TEACHER','2026-08-01','2026-12-31')",teacher,department,semester);
        jdbc.update("INSERT INTO teaching_qualification(teacher_id,subject_id,education_level_id,verification_status,verified_by,verified_at,evidence_ref,valid_from,valid_to) VALUES(?,1,1,'VERIFIED',?,now(),'rd:qualification','2026-08-01','2026-12-31')",teacher,actor);
        jdbc.update("INSERT INTO teaching_experience(teacher_id,subject_id,grade_id,recorded_by,experience_status,years_of_experience,as_of_date,evidence_ref,verified_by,verified_at) VALUES(?,1,1,?,'NO_EXPERIENCE',0,'2026-08-01','rd:zero-years',?,now())",teacher,actor,actor);
        jdbc.update("INSERT INTO teacher_workload_basis(teacher_id,semester_id,education_level_id,position_code,base_periods_per_week,unit,valid_from,valid_to,profile_ref,rule_definition_id,verification_status,verified_by,verified_at) VALUES(?,?,1,'TEACHER',17,'PERIOD_PER_WEEK','2026-08-01','2026-12-31','rd:basis',4,'VERIFIED',?,now())",teacher,semester,actor);
        period=jdbc.queryForObject("INSERT INTO calculation_period(semester_id,period_code,starts_on,ends_on) VALUES(?,'WHOLE','2026-08-01','2026-12-31') RETURNING id",Long.class,semester);
        jdbc.update("INSERT INTO teacher_period_workload(teacher_id,calculation_period_id,record_type,teaching_periods,verification_status,evidence_ref) VALUES(?,?,'OUTSIDE_SCOPE_WEEKLY',0,'VERIFIED','rd:confirmed-zero-outside')",teacher,period);
        jdbc.update("INSERT INTO school_context(semester_id,institution_type,class_counts_json,staffed_positions_json,verification_status,evidence_ref) VALUES(?,'MULTI_LEVEL','{}','{}','VERIFIED','rd:context')",semester);
        round=jdbc.queryForObject("INSERT INTO assignment_round(semester_id,round_code,status,scope_confirmed_by,scope_confirmed_at) VALUES(?,'RD','PREPARING',?,now()) RETURNING id",Long.class,semester,actor);
        scope=jdbc.queryForObject("INSERT INTO round_subject_scope(round_id,grade_id,subject_id,confirmed_by,confirmed_at) VALUES(?,1,1,?,now()) RETURNING id",Long.class,round,actor);
        applicability=jdbc.queryForObject("INSERT INTO class_subject_applicability(scope_id,class_id,status,updated_by,confirmed_by,confirmed_at) VALUES(?,?,'APPLICABLE',?,?,now()) RETURNING id",Long.class,scope,classroom,actor,actor);
        demand=jdbc.queryForObject("INSERT INTO teaching_demand(semester_id,class_id,subject_id,periods_per_week,status,updated_by,demand_type,valid_from,valid_to,unit) VALUES(?,?,1,2,'ACTIVE',?,'STANDARD','2026-08-01','2026-12-31','PERIOD_PER_WEEK') RETURNING id",Long.class,semester,classroom,actor);
        jdbc.update("INSERT INTO required_demand_component(applicability_id,demand_type,valid_from,valid_to,demand_id,confirmed_by,confirmed_at) VALUES(?,'STANDARD','2026-08-01','2026-12-31',?,?,now())",applicability,demand,actor);
        confirmComponents();
        jdbc.update("UPDATE teacher_period_workload SET input_confirmation_json=jsonb_build_object('contract_version',1,'round_id',?::bigint,'in_scope_demand_ids',jsonb_build_array(?::bigint),'outside_demand_ids','[]'::jsonb,'reduction_items','[]'::jsonb,'conversion_items','[]'::jsonb,'evidence_ref','rd:complete-input-inventory'),input_confirmed_by=?,input_confirmed_at=now() WHERE teacher_id=?",round,demand,actor,teacher);
    }

    private void confirmComponents() {
        jdbc.update("UPDATE class_subject_applicability SET components_confirmed_by=?,components_confirmed_at=now() WHERE id=?",actor,applicability);
    }
    private RoundReadinessDto check() { return readiness.check(round,1L,1L,principal); }
    private boolean has(RoundReadinessDto result,String code) { return result.issues().stream().anyMatch(i->i.code().equals(code)); }

    @Test
    void completeSourceWithExplicitZeroExperienceIsReadyForPartialDraftOnly() throws Exception {
        long snapshots=jdbc.queryForObject("SELECT count(*) FROM input_snapshot",Long.class);
        var result=check();
        assertTrue(result.canRunSolver(),result.issues().toString());
        assertFalse(result.canOpenFeedback());
        assertFalse(result.canExport());
        assertTrue(result.preflightOnly());
        assertFalse(result.solverInputValidated());
        assertTrue(has(result,"ANNUAL_WORKLOAD_NOT_VALIDATED"));
        assertFalse(has(result,"EXPERIENCE_UNKNOWN"));
        assertEquals(1,result.coverage().missingPlanRow());
        var body=mvc.perform(get("/api/assignment-rounds/{id}/readiness",round).principal(principal)
            .param("optimization_config_id","1").param("rule_set_version_id","1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.can_run_solver").value(true))
            .andExpect(jsonPath("$.can_open_feedback").value(false)).andReturn().getResponse().getContentAsString();
        assertEquals(result.sourceRevisionToken(),json.readTree(body).path("source_revision_token").asText());
        assertEquals(snapshots,jdbc.queryForObject("SELECT count(*) FROM input_snapshot",Long.class));
        assertEquals(result.sourceRevisionToken(),jdbc.queryForObject("SELECT source_revision_token FROM assignment_round WHERE id=?",String.class,round));
    }

    @Test
    void missingCandidateWarnsWithoutBlockingPartialSolve() {
        jdbc.update("UPDATE teaching_qualification SET verification_status='INACTIVE' WHERE teacher_id=?",teacher);
        var result=check();
        assertTrue(result.canRunSolver(),result.issues().toString());
        assertTrue(has(result,"NO_ELIGIBLE_TEACHER"));
        assertFalse(result.canOpenFeedback());
    }

    @Test
    void missingWeeklyLoadBlocksInsteadOfBecomingZero() {
        jdbc.update("DELETE FROM teacher_period_workload WHERE teacher_id=?",teacher);
        var result=check();
        assertFalse(result.canRunSolver());
        assertTrue(has(result,"WEEKLY_INPUT_MISSING"));
    }

    @Test
    void requiredSetMustBeCompleteAndConfirmed() {
        jdbc.update("DELETE FROM required_demand_component WHERE applicability_id=?",applicability);
        var result=check();
        assertFalse(result.canRunSolver());
        assertTrue(has(result,"REQUIRED_SET_UNCONFIRMED"));
        assertTrue(has(result,"EMPTY_REQUIRED_SET"));
        assertTrue(has(result,"ACTIVE_DEMAND_NOT_IN_REQUIRED_SET"));
    }

    @Test
    void unknownApplicabilityAndMissingScopeAreReported() {
        jdbc.update("UPDATE class_subject_applicability SET status='UNDETERMINED',confirmed_by=NULL,confirmed_at=NULL WHERE id=?",applicability);
        var result=check();
        assertFalse(result.canRunSolver());
        assertTrue(has(result,"UNDETERMINED"));
    }

    @Test
    void mixedDemandIntervalsAreRejectedWithoutDiscardingDemand() {
        long added=jdbc.queryForObject("INSERT INTO teaching_demand(semester_id,class_id,subject_id,periods_per_week,status,updated_by,demand_type,valid_from,valid_to,unit) SELECT semester_id,class_id,subject_id,1,'ACTIVE',?,'ENRICHMENT','2026-11-01',valid_to,unit FROM teaching_demand WHERE id=? RETURNING id",Long.class,actor,demand);
        jdbc.update("INSERT INTO required_demand_component(applicability_id,demand_type,valid_from,valid_to,demand_id,confirmed_by,confirmed_at) VALUES(?,'ENRICHMENT','2026-11-01','2026-12-31',?,?,now())",applicability,added,actor);
        confirmComponents();
        var result=check();
        assertFalse(result.canRunSolver());
        assertTrue(has(result,"UNSUPPORTED_EFFECTIVE_INTERVALS"));
        assertEquals(2,result.coverage().requiredComponents());
    }

    @Test
    void partialTermEmploymentIsUnsupportedRatherThanCheckedAtOneDay() {
        jdbc.update("UPDATE teacher_employment SET valid_to='2026-10-31' WHERE teacher_id=?",teacher);
        var result=check();
        assertFalse(result.canRunSolver());
        assertTrue(has(result,"UNSUPPORTED_EMPLOYMENT_INTERVAL"));
    }

    @Test
    void splitCalculationPeriodsAreExplicitlyUnsupported() {
        jdbc.update("DELETE FROM teacher_period_workload WHERE calculation_period_id=?",period);
        jdbc.update("UPDATE calculation_period SET ends_on='2026-10-31' WHERE id=?",period);
        jdbc.update("INSERT INTO calculation_period(semester_id,period_code,starts_on,ends_on) VALUES(?,'LATE','2026-11-01','2026-12-31')",semester);
        var result=check();
        assertFalse(result.canRunSolver());
        assertTrue(has(result,"UNSUPPORTED_CALCULATION_PERIODS"));
    }

    @Test
    void unknownExperienceBlocksOrUsesExplicitConfiguredPenalty() {
        jdbc.update("UPDATE teaching_experience SET experience_status='UNKNOWN',years_of_experience=NULL WHERE teacher_id=?",teacher);
        var blocked=check();
        assertFalse(blocked.canRunSolver());
        assertTrue(has(blocked,"EXPERIENCE_UNKNOWN"));
        long config=jdbc.queryForObject("INSERT INTO optimization_config(config_code,version_no,criteria_weights_json,time_limit_seconds,confirmed_by,confirmed_at) SELECT ?,1,jsonb_set(jsonb_set(criteria_weights_json,'{experience,unknown_policy}','\"PENALTY\"'),'{experience,unknown_penalty}','7'),time_limit_seconds,?,now() FROM optimization_config WHERE id=1 RETURNING id",Long.class,"RD-"+round,actor);
        var allowed=readiness.check(round,config,1L,principal);
        assertTrue(allowed.canRunSolver(),allowed.issues().toString());
        assertTrue(has(allowed,"EXPERIENCE_UNKNOWN_PENALIZED"));
    }

    @Test
    void currentSnapshotSelectsConfigurationAndUnknownSelectionDoesNotGuess() {
        var noChoice=readiness.check(round,null,null,principal);
        assertFalse(noChoice.canRunSolver());
        assertTrue(has(noChoice,"CONFIGURATION_SELECTION_REQUIRED"));
        var v=plans.create(round,new CreatePlanRequest(1L,1L),principal);
        var fromPlan=readiness.check(round,null,null,principal);
        assertEquals(v.versionId(),fromPlan.currentVersionId());
        assertEquals(1L,fromPlan.optimizationConfigId());
        assertTrue(fromPlan.canRunSolver(),fromPlan.issues().toString());
        assertFalse(fromPlan.canOpenFeedback());
    }

    private long prepareAssignedPlan() {
        var v=plans.create(round,new CreatePlanRequest(1L,1L),principal);
        new TransactionTemplate(transactions).executeWithoutResult(tx->jdbc.update(
            "UPDATE plan_demand SET teacher_id=?,unassigned_reason_code=NULL,unassigned_reason_text=NULL WHERE plan_version_id=?",teacher,v.versionId()));
        return v.versionId();
    }
    private void validateVersion(long version,boolean annualOnly) {
        long run=jdbc.queryForObject("INSERT INTO validation_run(plan_version_id,input_snapshot_id,revision_no,source_revision_token,overall_status,checked_by) SELECT v.id,v.input_snapshot_id,v.revision_no,s.source_revision_token,?,? FROM plan_version v JOIN input_snapshot s ON s.id=v.input_snapshot_id WHERE v.id=? RETURNING validation_run.id",Long.class,annualOnly?"INSUFFICIENT_DATA":"PASS",actor,version);
        jdbc.update("INSERT INTO validation_result(validation_run_id,br_code,subject_type,subject_ref,calculation_period,result_status,severity,message) VALUES(?,'BR-06','PLAN',?,'WEEKLY:2026-HK1','PASS','INFO','Test independent validation fixture')",run,Long.toString(version));
        if (annualOnly) jdbc.update("INSERT INTO validation_result(validation_run_id,br_code,subject_type,subject_ref,calculation_period,result_status,severity,missing_data_json,message) VALUES(?,'BR-09','PLAN',?,'ACADEMIC_YEAR:2026-2027','INSUFFICIENT_DATA','WARNING','[\"HK2_actuals\"]','Annual data missing')",run,Long.toString(version));
    }

    @Test
    void openingAndExportRequireCoverageFreshValidationAndCorrectLifecycle() {
        long version=prepareAssignedPlan();
        assertFalse(check().canOpenFeedback());
        validateVersion(version,true);
        assertTrue(check().canOpenFeedback(),check().issues().toString());
        assertFalse(check().canExport());
        jdbc.update("UPDATE plan_version SET status='READY_TO_EXPORT' WHERE id=?",version);
        assertFalse(check().canExport()); // State change itself increments revision.
        validateVersion(version,true);
        var export=check();
        assertTrue(export.canExport(),export.issues().toString());
        assertFalse(export.canRunSolver());
        jdbc.update("UPDATE teacher SET full_name='Changed source' WHERE id=?",teacher);
        var stale=check();
        assertFalse(stale.canExport());
        assertTrue(has(stale,"SNAPSHOT_STALE"));
    }

    @Test
    void missingWeeklyValidationCannotBeHiddenByAnnualWarningPolicy() {
        long version=prepareAssignedPlan();
        long run=jdbc.queryForObject("INSERT INTO validation_run(plan_version_id,input_snapshot_id,revision_no,source_revision_token,overall_status,checked_by) SELECT v.id,v.input_snapshot_id,v.revision_no,s.source_revision_token,'INSUFFICIENT_DATA',? FROM plan_version v JOIN input_snapshot s ON s.id=v.input_snapshot_id WHERE v.id=? RETURNING validation_run.id",Long.class,actor,version);
        jdbc.update("INSERT INTO validation_result(validation_run_id,br_code,subject_type,subject_ref,calculation_period,result_status,severity,missing_data_json,message) VALUES(?,'BR-06','PLAN',?,'WEEKLY:2026-HK1','INSUFFICIENT_DATA','ERROR','[\"weekly_limit\"]','Weekly data missing')",run,Long.toString(version));
        assertFalse(check().canOpenFeedback());
        assertTrue(check().canRunSolver());
    }

    @Test
    void unsupportedConversionUnitDoesNotInventWeeklyConversion() {
        jdbc.update("INSERT INTO converted_activity(teacher_id,calculation_period_id,rule_definition_id,activity_type,quantity,original_unit,approved_factor,converted_periods,include_in_workload,payment_status,verification_status,evidence_ref,approved_by) VALUES(?,?,3,'TEST',1,'HOURS',1,1,true,'DEMO_CONFIRMED','VERIFIED','rd:conversion',?)",teacher,period,actor);
        var result=check();
        assertFalse(result.canRunSolver());
        assertTrue(has(result,"UNSUPPORTED_CONVERSION_UNIT"));
    }

    @Test
    void rejectsAnonymousOutOfScopeBadSelectionAndMissingRound() throws Exception {
        mvc.perform(get("/api/assignment-rounds/{id}/readiness",round)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/assignment-rounds/{id}/readiness",round).principal(principal).param("optimization_config_id","1"))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/assignment-rounds/{id}/readiness",Long.MAX_VALUE).principal(principal)).andExpect(status().isNotFound());
        jdbc.update("DELETE FROM manager_scope WHERE user_id=?",actor);
        mvc.perform(get("/api/assignment-rounds/{id}/readiness",round).principal(principal))
            .andExpect(status().isForbidden());
    }
}
