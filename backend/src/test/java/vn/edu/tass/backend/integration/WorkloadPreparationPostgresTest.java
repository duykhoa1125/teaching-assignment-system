package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.edu.tass.backend.payload.request.CreatePlanRequest;
import vn.edu.tass.backend.service.AssignmentPlanService;
import vn.edu.tass.backend.solver.DbWorkloadPreparer;
import vn.edu.tass.backend.solver.WorkloadInputException;
import vn.edu.tass.backend.solver.WorkloadMath;
import vn.edu.tass.solver.Contract;
import vn.edu.tass.testing.PlanApiTestConfiguration;

@EnabledIfSystemProperty(named="plan.integration",matches="true")
@SpringBootTest(classes=PlanApiTestConfiguration.class)
@AutoConfigureMockMvc
class WorkloadPreparationPostgresTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) { AssignmentPlanPostgresTest.database(properties); }
    @Autowired JdbcTemplate jdbc;
    @Autowired AssignmentPlanService plans;
    @Autowired DbWorkloadPreparer preparer;
    @Autowired PlatformTransactionManager transactions;
    RoundReadinessPostgresTest f;

    @BeforeEach
    void sources() {
        // Reuse the same complete, isolated source fixture used by readiness, without inheriting its tests.
        f=new RoundReadinessPostgresTest(); f.jdbc=jdbc; f.fixture();
    }

    private DbWorkloadPreparer.Prepared capture() {
        var v=plans.create(f.round,new CreatePlanRequest(1L,1L),f.principal);
        return preparer.prepare(v.inputSnapshotId());
    }
    private void decimal(String expected,BigDecimal actual) { assertEquals(0,new BigDecimal(expected).compareTo(actual)); }
    private void addReductionAndConversion(String conversionTotal) {
        long reduction=jdbc.queryForObject("INSERT INTO teacher_duty(teacher_id,semester_id,rule_definition_id,duty_type,class_id,scope_description,valid_from,valid_to,reduction_value,verification_status,payment_status,evidence_ref,verified_by) SELECT ?,?,1,'HOMEROOM',class_id,'Test homeroom','2026-08-01','2026-12-31',4,'VERIFIED','DEMO_CONFIRMED','load:homeroom',? FROM teaching_demand WHERE id=? RETURNING teacher_duty.id",Long.class,f.teacher,f.semester,f.actor,f.demand);
        long conversion=jdbc.queryForObject("INSERT INTO converted_activity(teacher_id,calculation_period_id,rule_definition_id,activity_type,quantity,original_unit,approved_factor,converted_periods,include_in_workload,payment_status,verification_status,evidence_ref,approved_by) VALUES(?,?,3,'TEST',1.25,'PERIOD_PER_WEEK',1,?,true,'DEMO_CONFIRMED','VERIFIED','load:conversion',?) RETURNING id",Long.class,f.teacher,f.period,new BigDecimal(conversionTotal),f.actor);
        jdbc.update("UPDATE teacher_period_workload SET teaching_periods=3,input_confirmation_json=jsonb_set(jsonb_set(input_confirmation_json,'{reduction_items}',jsonb_build_array(jsonb_build_object('source_table','teacher_duty','source_id',?::bigint,'item_key','homeroom'))),'{conversion_items}',jsonb_build_array(jsonb_build_object('source_table','converted_activity','source_id',?::bigint,'item_key','conversion'))) WHERE teacher_id=?",reduction,conversion,f.teacher);
    }

    @Test
    void computesBfcrAndTBasedHardCheckFromCapturedSources() {
        addReductionAndConversion("1.25");
        var result=capture();
        var t=result.teachers().get(f.teacher);
        decimal("17",t.workload().base()); decimal("3",t.workload().fixedOutside());
        decimal("4",t.workload().reduction()); decimal("1.25",t.workload().converted());
        var load=WorkloadMath.evaluate(Long.toString(f.teacher),t.workload(),new BigDecimal("2"));
        decimal("6.25",load.W()); decimal("10.25",load.T()); decimal("-6.75",load.deltaT());
        var weekly=t.hardChecks().get(0);
        decimal("7",weekly.fixed()); decimal("1.25",weekly.converted()); decimal("25",weekly.limit());
        assertEquals(Map.of(Long.toString(f.demand),new BigDecimal("2")),weekly.coefficients());
        assertTrue(weekly.source().contains("basis=T"));
        assertEquals(Contract.CheckStatus.INSUFFICIENT_DATA,t.hardChecks().get(1).dataStatus());
        assertTrue(result.rulesReady());
        assertEquals(100,result.integerScale());
    }

    @Test
    void confirmedEmptyInventoriesProduceExplicitZeroCredits() {
        var t=capture().teachers().get(f.teacher);
        decimal("0",t.workload().reduction()); decimal("0",t.workload().converted());
        assertEquals(6L,t.experiencePenalties().get(Long.toString(f.demand))); // Known zero years uses configured first band.
    }

    @Test
    void absenceOfInventoryCannotBeTreatedAsZeroCredits() {
        jdbc.update("UPDATE teacher_period_workload SET input_confirmation_json=NULL,input_confirmed_by=NULL,input_confirmed_at=NULL WHERE teacher_id=?",f.teacher);
        var error=assertThrows(WorkloadInputException.class,this::capture);
        assertEquals("WORKLOAD_INVENTORY_UNCONFIRMED",error.code());
    }

    @Test
    void unlistedApplicableSourceIsNotSilentlyDiscarded() {
        jdbc.update("INSERT INTO teacher_reduction(teacher_id,semester_id,rule_definition_id,reduction_type,valid_from,valid_to,reduction_value,conditions_json,verification_status,evidence_ref,verified_by) VALUES(?,?,2,'PERSONAL','2026-08-01','2026-12-31',1,'{}','VERIFIED','load:personal',?)",f.teacher,f.semester,f.actor);
        assertEquals("WORKLOAD_INVENTORY_STALE",assertThrows(WorkloadInputException.class,this::capture).code());
    }

    @Test
    void sameUnderlyingItemCannotCountInBothCAndR() {
        addReductionAndConversion("1.25");
        jdbc.update("UPDATE teacher_period_workload SET input_confirmation_json=jsonb_set(input_confirmation_json,'{conversion_items,0,item_key}','\"homeroom\"') WHERE teacher_id=?",f.teacher);
        assertEquals("DUPLICATE_WORKLOAD_ITEM",assertThrows(WorkloadInputException.class,this::capture).code());
    }

    @Test
    void storedConversionMustEqualExactQuantityTimesApprovedFactor() {
        addReductionAndConversion("1.24");
        assertEquals("CONVERSION_TOTAL_MISMATCH",assertThrows(WorkloadInputException.class,this::capture).code());
    }

    @Test
    void cannotUseRuleMaximumAsTheChosenFactor() {
        addReductionAndConversion("2.50");
        jdbc.update("UPDATE converted_activity SET approved_factor=2 WHERE teacher_id=?",f.teacher);
        assertEquals("CONVERSION_FACTOR_MISMATCH",assertThrows(WorkloadInputException.class,this::capture).code());
    }

    @Test
    void wholeTermLeaveExcludesTargetAndEligibilityWithoutInventingBaseline() {
        jdbc.update("UPDATE teacher_employment SET employment_status='ON_LEAVE' WHERE teacher_id=?",f.teacher);
        var t=capture().teachers().get(f.teacher);
        assertFalse(t.workload().targetApplicable()); assertTrue(t.experiencePenalties().isEmpty());
        assertEquals(Contract.EmploymentStatus.FULL_TERM_LEAVE,t.employments().get(0).status());
        var load=WorkloadMath.evaluate(Long.toString(f.teacher),t.workload(),BigDecimal.ZERO);
        assertNull(load.deltaT()); assertNull(load.under()); assertNull(load.over());
        decimal("17",load.B());
    }

    @Test
    void qualificationMustCoverTheWholeIntervalAndMayUseAdjacentVerifiedEvidence() {
        jdbc.update("UPDATE teaching_qualification SET valid_to='2026-10-31' WHERE teacher_id=?",f.teacher);
        var first=capture();
        assertTrue(first.teachers().get(f.teacher).experiencePenalties().isEmpty());
        jdbc.update("INSERT INTO teaching_qualification(teacher_id,subject_id,education_level_id,verification_status,verified_by,verified_at,evidence_ref,valid_from,valid_to) VALUES(?,1,1,'VERIFIED',?,now(),'load:second-interval','2026-11-01','2026-12-31')",f.teacher,f.actor);
        var v=plans.current(f.round,f.principal);
        var refreshed=plans.refresh(v.versionId(),new vn.edu.tass.backend.payload.request.RefreshPlanSnapshotRequest(v.revisionNo(),1L,1L),f.principal);
        var second=preparer.prepare(refreshed.inputSnapshotId());
        assertEquals(1,second.teachers().get(f.teacher).experiencePenalties().size());
        assertEquals(1,second.teachers().get(f.teacher).qualifications().size());
        assertTrue(second.teachers().get(f.teacher).qualifications().get(0).source().contains("load:second-interval"));
    }

    @Test
    void experienceUsesLatestSubjectGradeEvidenceBeforeConfiguredDate() {
        jdbc.update("INSERT INTO teaching_experience(teacher_id,subject_id,grade_id,recorded_by,experience_status,years_of_experience,as_of_date,evidence_ref,verified_by,verified_at) VALUES(?,1,1,?,'HAS_EXPERIENCE',5,'2026-09-01','load:future-profile',?,now())",f.teacher,f.actor,f.actor);
        var t=capture().teachers().get(f.teacher);
        assertEquals(6L,t.experiencePenalties().get(Long.toString(f.demand))); // Config date is Aug 1; future profile is excluded.
    }

    @Test
    void unknownExperienceIsBlockedOrPenalizedExplicitly() {
        jdbc.update("UPDATE teaching_experience SET experience_status='UNKNOWN',years_of_experience=NULL WHERE teacher_id=?",f.teacher);
        assertEquals("EXPERIENCE_NOT_READY",assertThrows(WorkloadInputException.class,this::capture).code());
        long config=jdbc.queryForObject("INSERT INTO optimization_config(config_code,version_no,criteria_weights_json,time_limit_seconds,confirmed_by,confirmed_at) SELECT ?,1,jsonb_set(jsonb_set(criteria_weights_json,'{experience,unknown_policy}','\"PENALTY\"'),'{experience,unknown_penalty}','8'),time_limit_seconds,?,now() FROM optimization_config WHERE id=1 RETURNING id",Long.class,"LOAD-"+f.round,f.actor);
        var v=plans.current(f.round,f.principal);
        var refreshed=plans.refresh(v.versionId(),new vn.edu.tass.backend.payload.request.RefreshPlanSnapshotRequest(v.revisionNo(),config,1L),f.principal);
        assertEquals(8L,preparer.prepare(refreshed.inputSnapshotId()).teachers().get(f.teacher).experiencePenalties().get(Long.toString(f.demand)));
    }

    @Test
    void locksStayInsideAAndNeverBecomeFixedOutsideLoad() {
        var v=plans.create(f.round,new CreatePlanRequest(1L,1L),f.principal);
        new TransactionTemplate(transactions).executeWithoutResult(tx->jdbc.update("UPDATE plan_demand SET teacher_id=?,unassigned_reason_code=NULL,unassigned_reason_text=NULL,is_locked=true,locked_by=?,locked_at=now(),lock_reason='Confirmed test lock' WHERE plan_version_id=?",f.teacher,f.actor,v.versionId()));
        var current=plans.current(f.round,f.principal);
        var refreshed=plans.refresh(current.versionId(),new vn.edu.tass.backend.payload.request.RefreshPlanSnapshotRequest(current.revisionNo(),1L,1L),f.principal);
        var t=preparer.prepare(refreshed.inputSnapshotId()).teachers().get(f.teacher);
        decimal("0",t.workload().fixedOutside());
        decimal("2",WorkloadMath.evaluate(Long.toString(f.teacher),t.workload(),new BigDecimal("2")).A());
    }

    @Test
    void refusesOutsideSourceThatIncludesAnInScopeDemand() {
        jdbc.update("UPDATE teacher_period_workload SET input_confirmation_json=jsonb_set(input_confirmation_json,'{outside_demand_ids}',jsonb_build_array(?::bigint)) WHERE teacher_id=?",f.demand,f.teacher);
        assertEquals("OUTSIDE_LOAD_OVERLAP",assertThrows(WorkloadInputException.class,this::capture).code());
    }

    @Test
    void capturedCalculationDoesNotReadChangedLiveSources() {
        var v=plans.create(f.round,new CreatePlanRequest(1L,1L),f.principal);
        var before=preparer.prepare(v.inputSnapshotId());
        jdbc.update("UPDATE teacher_period_workload SET teaching_periods=9 WHERE teacher_id=?",f.teacher);
        var after=preparer.prepare(v.inputSnapshotId());
        assertEquals(before,after);
        decimal("0",after.teachers().get(f.teacher).workload().fixedOutside());
    }

    @Test
    void reductionGreaterThanBaselineDoesNotUseClampedQAsMainDeviation() {
        var w=new Contract.Workload(new BigDecimal("17"),new BigDecimal("20"),BigDecimal.ZERO,BigDecimal.ZERO,true,"confirmed:test","baseline:test",java.util.List.of());
        var load=WorkloadMath.evaluate("test",w,BigDecimal.ZERO);
        decimal("0",load.Q()); decimal("3",load.deltaT()); decimal("3",load.over());
    }
}
