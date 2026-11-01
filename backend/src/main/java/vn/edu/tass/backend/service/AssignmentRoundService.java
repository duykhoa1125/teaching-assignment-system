package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.AssignmentRoundDto;
import vn.edu.tass.backend.payload.request.AssignmentRoundRequest;

public interface AssignmentRoundService {
    List<AssignmentRoundDto> retrieveAllAssignmentRound(int limit, int offset);
    AssignmentRoundDto retrieveById(long id);
    AssignmentRoundDto createAssignmentRound(AssignmentRoundRequest request);
    AssignmentRoundDto updateAssignmentRound(long id, AssignmentRoundRequest request);
    void deleteAssignmentRound(long id);
}