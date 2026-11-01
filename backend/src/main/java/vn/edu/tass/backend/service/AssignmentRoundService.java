package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.AssignmentRound;
import vn.edu.tass.backend.payload.request.AssignmentRoundRequest;

public interface AssignmentRoundService {
    List<AssignmentRound> list(int limit, int offset);
    AssignmentRound get(long id);
    AssignmentRound create(AssignmentRoundRequest request);
    AssignmentRound replace(long id, AssignmentRoundRequest request);
    void delete(long id);
}
