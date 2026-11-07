package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.EducationLevelDto;
import vn.edu.tass.backend.payload.request.EducationLevelRequest;

public interface EducationLevelService {
    List<EducationLevelDto> retrieveAllEducationLevel(int limit, int offset);
    EducationLevelDto retrieveById(long id);
    EducationLevelDto createEducationLevel(EducationLevelRequest request);
    EducationLevelDto updateEducationLevel(long id, EducationLevelRequest request);
    void deleteEducationLevel(long id);
}