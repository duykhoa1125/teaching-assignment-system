package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.EducationLevel;
import vn.edu.tass.backend.payload.request.EducationLevelRequest;

public interface EducationLevelService {
    List<EducationLevel> list(int limit, int offset);
    EducationLevel get(long id);
    EducationLevel create(EducationLevelRequest request);
    EducationLevel replace(long id, EducationLevelRequest request);
    void delete(long id);
}
