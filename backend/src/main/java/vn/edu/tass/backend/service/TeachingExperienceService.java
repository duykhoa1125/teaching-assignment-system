package vn.edu.tass.backend.service;

import java.time.LocalDate;
import java.util.List;
import vn.edu.tass.backend.payload.dto.TeachingExperienceDto;
import vn.edu.tass.backend.payload.request.TeachingExperienceRequest;

public interface TeachingExperienceService {
    List<TeachingExperienceDto> retrieveAllTeachingExperience(int limit, int offset);
    List<TeachingExperienceDto> searchTeachingExperience(int limit, int offset, Long teacherId, Long subjectId, Long gradeId, String experienceStatus, LocalDate asOfDate);
    TeachingExperienceDto retrieveById(long id);
    TeachingExperienceDto createTeachingExperience(TeachingExperienceRequest request);
    TeachingExperienceDto updateTeachingExperience(long id, TeachingExperienceRequest request);
    void deleteTeachingExperience(long id);
}
