package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.TeachingQualificationDto;
import vn.edu.tass.backend.payload.request.TeachingQualificationRequest;

public interface TeachingQualificationService {
    List<TeachingQualificationDto> retrieveAllTeachingQualification(int limit, int offset);
    TeachingQualificationDto retrieveById(long id);
    TeachingQualificationDto createTeachingQualification(TeachingQualificationRequest request);
    TeachingQualificationDto updateTeachingQualification(long id, TeachingQualificationRequest request);
    void deleteTeachingQualification(long id);
}