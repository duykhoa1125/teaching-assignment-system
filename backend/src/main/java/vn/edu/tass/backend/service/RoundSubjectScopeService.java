package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.RoundSubjectScopeDto;
import vn.edu.tass.backend.payload.request.RoundSubjectScopeRequest;

public interface RoundSubjectScopeService {
    List<RoundSubjectScopeDto> retrieveAllRoundSubjectScope(int limit, int offset);
    RoundSubjectScopeDto retrieveById(long id);
    RoundSubjectScopeDto createRoundSubjectScope(RoundSubjectScopeRequest request);
    RoundSubjectScopeDto updateRoundSubjectScope(long id, RoundSubjectScopeRequest request);
    void deleteRoundSubjectScope(long id);
}