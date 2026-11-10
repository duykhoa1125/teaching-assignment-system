package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.GradeDto;
import vn.edu.tass.backend.payload.request.GradeRequest;

public interface GradeService {
    List<GradeDto> retrieveAllGrade(int limit, int offset);
    List<GradeDto> searchGrade(int limit, int offset, Long educationLevelId);
    GradeDto retrieveById(long id);
    GradeDto createGrade(GradeRequest request);
    GradeDto updateGrade(long id, GradeRequest request);
    void deleteGrade(long id);
}
