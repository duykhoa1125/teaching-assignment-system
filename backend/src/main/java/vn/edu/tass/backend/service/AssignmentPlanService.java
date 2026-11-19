package vn.edu.tass.backend.service;

import vn.edu.tass.backend.payload.dto.AssignmentPlanDto;
import vn.edu.tass.backend.payload.request.CreateAssignmentPlanRequest;

public interface AssignmentPlanService {
    AssignmentPlanDto retrieve(long roundId);
    AssignmentPlanDto create(long roundId, CreateAssignmentPlanRequest request);
}
