package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.TeachingDemand;
import vn.edu.tass.backend.payload.request.TeachingDemandRequest;

public interface TeachingDemandService {
    List<TeachingDemand> list(int limit, int offset);
    TeachingDemand get(long id);
    TeachingDemand create(TeachingDemandRequest request);
    TeachingDemand replace(long id, TeachingDemandRequest request);
    void delete(long id);
}
