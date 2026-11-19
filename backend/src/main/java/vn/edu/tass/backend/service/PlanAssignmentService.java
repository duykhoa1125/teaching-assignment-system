package vn.edu.tass.backend.service;

import java.time.LocalDate;
import java.util.List;
import vn.edu.tass.backend.payload.dto.PlanAssignmentDto;

public interface PlanAssignmentService {
    List<PlanAssignmentDto> retrieve(long versionId, int limit, long offset, Long teacherId,
        Long classId, Long subjectId, String demandType, LocalDate asOf);

}
