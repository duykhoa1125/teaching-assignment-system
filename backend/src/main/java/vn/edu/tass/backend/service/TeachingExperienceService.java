package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.TeachingExperience;
import vn.edu.tass.backend.payload.request.TeachingExperienceRequest;

public interface TeachingExperienceService {
    List<TeachingExperience> list(int limit, int offset);
    TeachingExperience get(long id);
    TeachingExperience create(TeachingExperienceRequest request);
    TeachingExperience replace(long id, TeachingExperienceRequest request);
    void delete(long id);
}
