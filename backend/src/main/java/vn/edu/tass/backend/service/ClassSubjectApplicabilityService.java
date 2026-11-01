package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.ClassSubjectApplicability;
import vn.edu.tass.backend.payload.request.ClassSubjectApplicabilityRequest;

public interface ClassSubjectApplicabilityService {
    List<ClassSubjectApplicability> list(int limit, int offset);
    ClassSubjectApplicability get(long id);
    ClassSubjectApplicability create(ClassSubjectApplicabilityRequest request);
    ClassSubjectApplicability replace(long id, ClassSubjectApplicabilityRequest request);
    void delete(long id);
}
