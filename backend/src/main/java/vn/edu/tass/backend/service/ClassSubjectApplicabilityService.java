package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.ClassSubjectApplicabilityDto;
import vn.edu.tass.backend.payload.request.ClassSubjectApplicabilityRequest;

public interface ClassSubjectApplicabilityService {
    List<ClassSubjectApplicabilityDto> retrieveAllClassSubjectApplicability(int limit, int offset);
    ClassSubjectApplicabilityDto retrieveById(long id);
    ClassSubjectApplicabilityDto createClassSubjectApplicability(ClassSubjectApplicabilityRequest request);
    ClassSubjectApplicabilityDto updateClassSubjectApplicability(long id, ClassSubjectApplicabilityRequest request);
    void deleteClassSubjectApplicability(long id);
}