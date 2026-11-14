package vn.edu.tass.backend.service;

import java.security.Principal;
import vn.edu.tass.backend.payload.dto.PlanVersionDto;
import vn.edu.tass.backend.payload.request.CreatePlanRequest;
import vn.edu.tass.backend.payload.request.RefreshPlanSnapshotRequest;

public interface AssignmentPlanService {
    PlanVersionDto current(long roundId, Principal principal);
    PlanVersionDto version(long versionId, Principal principal);
    PlanVersionDto create(long roundId, CreatePlanRequest request, Principal principal);
    PlanVersionDto refresh(long versionId, RefreshPlanSnapshotRequest request, Principal principal);
}
