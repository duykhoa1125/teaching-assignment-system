package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.RoundSubjectScope;
import vn.edu.tass.backend.payload.request.RoundSubjectScopeRequest;

public interface RoundSubjectScopeService {
    List<RoundSubjectScope> list(int limit, int offset);
    RoundSubjectScope get(long id);
    RoundSubjectScope create(RoundSubjectScopeRequest request);
    RoundSubjectScope replace(long id, RoundSubjectScopeRequest request);
    void delete(long id);
}
