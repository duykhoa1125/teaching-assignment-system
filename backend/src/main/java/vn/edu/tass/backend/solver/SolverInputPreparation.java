package vn.edu.tass.backend.solver;

import java.security.Principal;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.exception.PlanOperationException;
import vn.edu.tass.backend.payload.dto.PlanVersionDto;
import vn.edu.tass.backend.repository.AssignmentPlanRepository;
import vn.edu.tass.backend.repository.SolverInputRepository;
import vn.edu.tass.backend.repository.WorkloadSourceRepository;
import vn.edu.tass.backend.service.PlanActorResolver;
import vn.edu.tass.backend.service.RoundReadinessService;
import vn.edu.tass.solver.InputValidator;
import vn.edu.tass.solver.Json;

/** Internal preparation/archive boundary. Async execution and apply are separate transactions. */
@Component
public class SolverInputPreparation {
    public record PreparedRun(long runId,SolverInputArchive input) {}
    private final PlanActorResolver actors;
    private final AssignmentPlanRepository plans;
    private final RoundReadinessService readiness;
    private final WorkloadSourceRepository sources;
    private final SolverInputRepository archive;
    private final SolverSnapshotMapper mapper;
    private final InputValidator validator;

    public SolverInputPreparation(PlanActorResolver actors,AssignmentPlanRepository plans,RoundReadinessService readiness,
            WorkloadSourceRepository sources,SolverInputRepository archive,SolverSnapshotMapper mapper,InputValidator validator) {
        this.actors=actors; this.plans=plans; this.readiness=readiness; this.sources=sources;
        this.archive=archive; this.mapper=mapper; this.validator=validator;
    }

    @Transactional
    public PreparedRun prepare(long versionId,long expectedRevision,long configId,long rulesId,Principal principal) {
        long actor=actors.requireActor(principal);
        if (versionId<=0 || expectedRevision<0 || configId<=0 || rulesId<=0) throw new BadRequestException("ID phải dương và revision không âm.");
        var initial=version(versionId);
        authorize(actor,initial.roundId());
        plans.lockPlan(initial.planId()); plans.lockVersion(versionId); plans.lockRound(initial.roundId());
        var locked=version(versionId);
        authorize(actor,locked.roundId());
        if (!locked.isCurrent() || !"DRAFT".equals(locked.status())) throw conflict("CURRENT_DRAFT_REQUIRED","Chỉ current DRAFT được chuẩn bị lượt giải.");
        if (locked.revisionNo()!=expectedRevision) throw conflict("REVISION_CONFLICT","Revision đã thay đổi; đọc lại DRAFT.");
        if (!locked.snapshotFresh()) throw conflict("STALE_INPUT","Nguồn đã đổi; refresh snapshot và đọc revision mới.");
        if (locked.optimizationConfigId()!=configId || locked.ruleSetVersionId()!=rulesId) {
            throw conflict("SNAPSHOT_REFRESH_REQUIRED","Refresh snapshot bằng cấu hình/quy tắc đã chọn trước khi chuẩn bị lượt giải.");
        }
        var checked=readiness.check(locked.roundId(),configId,rulesId,principal);
        if (!checked.canRunSolver()) {
            String codes=checked.issues().stream().filter(i->"ERROR".equals(i.severity())).map(i->i.code()).distinct().collect(Collectors.joining(", "));
            throw new PlanOperationException(HttpStatus.UNPROCESSABLE_ENTITY,"SOLVER_NOT_READY","Dữ liệu chưa sẵn sàng: "+codes);
        }
        var captured=sources.read(locked.inputSnapshotId()).orElseThrow(()->new NotFoundException("Không tìm thấy snapshot nguồn."));
        var input=mapper.map(captured,locked,archive.assignments(versionId),SolverSnapshotMapper.RuntimeOptions.defaults());
        long runId=archive.insert(input,actor);
        return new PreparedRun(runId,input);
    }

    /** History/replay stays readable after source changes; replay never authorizes apply. */
    @Transactional(readOnly=true)
    public PreparedRun replay(long runId,Principal principal) {
        long actor=actors.requireActor(principal);
        var saved=run(runId); authorize(actor,saved.roundId());
        return decode(saved);
    }

    /** SOL-07 must call this from its outer apply transaction so locks remain held through commit. */
    @Transactional
    public PreparedRun requireFresh(long runId,Principal principal) {
        long actor=actors.requireActor(principal);
        var saved=run(runId); authorize(actor,saved.roundId());
        plans.lockPlan(saved.planId()); plans.lockVersion(saved.versionId()); plans.lockRound(saved.roundId());
        authorize(actor,saved.roundId());
        if (!archive.fresh(runId)) throw conflict("STALE_INPUT","Lượt giải không còn khớp current DRAFT/revision/snapshot/nguồn.");
        return decode(saved);
    }

    PreparedRun decode(SolverInputRepository.Archive saved) {
        if (saved.canonical()==null || !"tass-solver/2".equals(saved.schemaVersion())) {
            throw new PlanOperationException(HttpStatus.UNPROCESSABLE_ENTITY,"SOLVER_INPUT_NOT_AVAILABLE","Lượt cũ chưa có đầu vào chuẩn hóa được lưu.");
        }
        try {
            var snapshot=Json.MAPPER.readValue(saved.canonical(),vn.edu.tass.solver.Contract.Snapshot.class);
            validator.validate(snapshot);
            var normalized=SolverInputArchive.create(snapshot);
            if (!normalized.sha256().equals(saved.hash()) || !normalized.canonicalJson().equals(saved.canonical())) {
                throw new IllegalStateException("Archived solver input fails canonical/hash verification");
            }
            var id=snapshot.identity();
            if (!id.versionId().equals(Long.toString(saved.versionId())) || id.baseRevision()!=saved.revision()
                || !id.snapshotId().equals(Long.toString(saved.snapshotId())) || !id.sourceRevisionToken().equals(saved.token())) {
                throw new IllegalStateException("Archived solver input identity differs from run");
            }
            return new PreparedRun(saved.id(),normalized);
        } catch (java.io.IOException e) { throw new IllegalStateException("Archived solver input cannot be decoded",e); }
    }
    private SolverInputRepository.Archive run(long id) {
        if (id<=0) throw new BadRequestException("ID phải dương.");
        return archive.read(id).orElseThrow(()->new NotFoundException("Không tìm thấy lượt giải."));
    }
    private PlanVersionDto version(long id) { return plans.version(id).orElseThrow(()->new NotFoundException("Không tìm thấy version.")); }
    private void authorize(long actor,long roundId) {
        if (!plans.canManage(actor,roundId)) throw new PlanOperationException(HttpStatus.FORBIDDEN,"PLAN_ACCESS_DENIED","Không có quyền quản lý toàn bộ phạm vi đợt.");
    }
    private static PlanOperationException conflict(String code,String message) { return new PlanOperationException(HttpStatus.CONFLICT,code,message); }
}
