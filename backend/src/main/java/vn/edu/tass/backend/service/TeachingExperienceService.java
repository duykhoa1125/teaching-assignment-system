package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.TeachingExperienceDto;
import vn.edu.tass.backend.payload.request.TeachingExperienceRequest;

public interface TeachingExperienceService {
    List<TeachingExperienceDto> retrieveAllTeachingExperience(int limit, int offset);
    TeachingExperienceDto retrieveById(long id);
    TeachingExperienceDto createTeachingExperience(TeachingExperienceRequest request);
    TeachingExperienceDto updateTeachingExperience(long id, TeachingExperienceRequest request);
    void deleteTeachingExperience(long id);
}