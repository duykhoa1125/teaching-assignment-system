package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.AssignmentRoundDto;
import vn.edu.tass.backend.payload.request.AssignmentRoundRequest;

public interface AssignmentRoundService {
    List<AssignmentRoundDto> retrieveAllAssignmentRound(int limit, int offset);
    List<AssignmentRoundDto> searchAssignmentRound(int limit, int offset, Long semesterId, String status);
    AssignmentRoundDto retrieveById(long id);
    AssignmentRoundDto createAssignmentRound(AssignmentRoundRequest request);
    AssignmentRoundDto updateAssignmentRound(long id, AssignmentRoundRequest request);
    void deleteAssignmentRound(long id);
}
