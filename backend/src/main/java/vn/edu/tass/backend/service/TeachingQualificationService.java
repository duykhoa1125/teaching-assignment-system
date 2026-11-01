package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.TeachingQualification;
import vn.edu.tass.backend.payload.request.TeachingQualificationRequest;

public interface TeachingQualificationService {
    List<TeachingQualification> list(int limit, int offset);
    TeachingQualification get(long id);
    TeachingQualification create(TeachingQualificationRequest request);
    TeachingQualification replace(long id, TeachingQualificationRequest request);
    void delete(long id);
}
