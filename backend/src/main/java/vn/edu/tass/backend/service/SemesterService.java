package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.SemesterDto;
import vn.edu.tass.backend.payload.request.SemesterRequest;

public interface SemesterService {
    List<SemesterDto> retrieveAllSemester(int limit, int offset);
    SemesterDto retrieveById(long id);
    SemesterDto createSemester(SemesterRequest request);
    SemesterDto updateSemester(long id, SemesterRequest request);
    void deleteSemester(long id);
}