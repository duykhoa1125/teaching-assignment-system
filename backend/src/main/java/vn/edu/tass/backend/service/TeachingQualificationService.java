package vn.edu.tass.backend.service;

import java.time.LocalDate;
import java.util.List;
import vn.edu.tass.backend.payload.dto.TeachingQualificationDto;
import vn.edu.tass.backend.payload.request.TeachingQualificationRequest;

public interface TeachingQualificationService {
    List<TeachingQualificationDto> retrieveAllTeachingQualification(int limit, int offset);
    List<TeachingQualificationDto> searchTeachingQualification(int limit, int offset, Long teacherId, Long subjectId, Long educationLevelId, String verificationStatus, LocalDate asOf);
    TeachingQualificationDto retrieveById(long id);
    TeachingQualificationDto createTeachingQualification(TeachingQualificationRequest request);
    TeachingQualificationDto updateTeachingQualification(long id, TeachingQualificationRequest request);
    void deleteTeachingQualification(long id);
}
