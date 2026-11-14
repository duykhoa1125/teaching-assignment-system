package vn.edu.tass.backend.service.impl;

import java.security.Principal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.exception.PlanOperationException;
import vn.edu.tass.backend.payload.dto.PlanVersionDto;
import vn.edu.tass.backend.payload.request.CreatePlanRequest;
import vn.edu.tass.backend.payload.request.RefreshPlanSnapshotRequest;
import vn.edu.tass.backend.repository.AssignmentPlanRepository;
import vn.edu.tass.backend.service.AssignmentPlanService;
import vn.edu.tass.backend.service.PlanActorResolver;

@Service
public class AssignmentPlanServiceImpl implements AssignmentPlanService {
    private final AssignmentPlanRepository store;
    private final PlanActorResolver actors;

    public AssignmentPlanServiceImpl(AssignmentPlanRepository store, PlanActorResolver actors) {
        this.store = store;
        this.actors = actors;
    }

    @Override
    @Transactional(readOnly = true)
    public PlanVersionDto current(long roundId, Principal principal) {
        long actor = actors.requireActor(principal);
        authorize(actor, roundId);
        return store.current(roundId).orElseThrow(() -> new NotFoundException("Đợt chưa có phương án."));
    }

    @Override
    @Transactional(readOnly = true)
    public PlanVersionDto version(long versionId, Principal principal) {
        long actor = actors.requireActor(principal);
        var version = requireVersion(versionId);
        authorize(actor, version.roundId());
        return version;
    }

    @Override
    @Transactional
    public PlanVersionDto create(long roundId, CreatePlanRequest request, Principal principal) {
        long actor = actors.requireActor(principal);
        authorize(actor, roundId);
        // Serialize initialization on the existing round; no plan/version row exists yet.
        store.lockRound(roundId);
        authorize(actor, roundId);
        if (store.planExists(roundId)) {
            throw conflict("PLAN_ALREADY_EXISTS", "Đợt đã có phương án; đọc lại current version.");
        }
        requireConfiguration(roundId, request.optimizationConfigId(), request.ruleSetVersionId());
        store.setActor(actor);
        long snapshotId = store.capture(roundId, request.optimizationConfigId(), request.ruleSetVersionId(), 0);
        long planId = store.insertPlan(roundId, actor);
        long versionId = store.insertVersion(planId, snapshotId, actor);
        store.setCurrent(planId, versionId);
        store.synchronizeDemands(versionId, snapshotId);
        // Every inserted demand increments the DB revision; read its actual final value.
        return requireVersion(versionId);
    }

    @Override
    @Transactional
    public PlanVersionDto refresh(long versionId, RefreshPlanSnapshotRequest request, Principal principal) {
        long actor = actors.requireActor(principal);
        var initial = requireVersion(versionId);
        authorize(actor, initial.roundId());
        // Same order as assignment triggers: plan, version, then source round.
        store.lockPlan(initial.planId());
        store.lockVersion(versionId);
        var locked = requireVersion(versionId);
        if (!locked.isCurrent() || !"DRAFT".equals(locked.status())) {
            throw conflict("CURRENT_DRAFT_REQUIRED", "Chỉ current DRAFT được làm mới snapshot.");
        }
        if (locked.revisionNo() != request.expectedRevision()) {
            throw conflict("REVISION_CONFLICT", "Revision đã thay đổi; đọc lại phương án.");
        }
        store.lockRound(locked.roundId());
        authorize(actor, locked.roundId());
        requireConfiguration(locked.roundId(), request.optimizationConfigId(), request.ruleSetVersionId());
        store.setActor(actor);
        long snapshotId = store.capture(locked.roundId(), request.optimizationConfigId(), request.ruleSetVersionId(), versionId);
        if (store.incompatibleLocks(versionId, snapshotId)) {
            throw conflict("LOCK_CONFLICT", "Dữ liệu mới xung đột với phân công đã khóa; cần xử lý khóa trước khi làm mới.");
        }
        store.replaceSnapshot(versionId, snapshotId);
        store.synchronizeDemands(versionId, snapshotId);
        return requireVersion(versionId);
    }

    private void authorize(long actor, long roundId) {
        if (roundId <= 0) throw new BadRequestException("ID phải dương.");
        if (!store.roundExists(roundId)) throw new NotFoundException("Không tìm thấy đợt phân công.");
        if (!store.canManage(actor, roundId)) {
            throw new PlanOperationException(HttpStatus.FORBIDDEN, "PLAN_ACCESS_DENIED", "Không có quyền quản lý toàn bộ phạm vi đợt.");
        }
    }

    private PlanVersionDto requireVersion(long id) {
        if (id <= 0) throw new BadRequestException("ID phải dương.");
        return store.version(id).orElseThrow(() -> new NotFoundException("Không tìm thấy phiên bản phương án."));
    }

    private void requireConfiguration(long roundId, long configId, long rulesId) {
        if (!store.configurationConfirmed(roundId, configId, rulesId)) {
            throw new PlanOperationException(HttpStatus.UNPROCESSABLE_ENTITY, "CONFIGURATION_NOT_CONFIRMED",
                "Cấu hình/quy tắc phải tồn tại, được xác nhận và quy tắc phủ toàn học kỳ.");
        }
    }

    private static PlanOperationException conflict(String code, String message) {
        return new PlanOperationException(HttpStatus.CONFLICT, code, message);
    }
}
