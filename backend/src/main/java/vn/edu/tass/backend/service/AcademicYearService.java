package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.AcademicYearDto;
import vn.edu.tass.backend.payload.request.AcademicYearRequest;

public interface AcademicYearService {
    List<AcademicYearDto> retrieveAllAcademicYear(int limit, int offset);
    AcademicYearDto retrieveById(long id);
    AcademicYearDto createAcademicYear(AcademicYearRequest request);
    AcademicYearDto updateAcademicYear(long id, AcademicYearRequest request);
    void deleteAcademicYear(long id);
}