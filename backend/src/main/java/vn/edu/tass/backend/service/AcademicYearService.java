package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.AcademicYear;
import vn.edu.tass.backend.payload.request.AcademicYearRequest;

public interface AcademicYearService {
    List<AcademicYear> list(int limit, int offset);
    AcademicYear get(long id);
    AcademicYear create(AcademicYearRequest request);
    AcademicYear replace(long id, AcademicYearRequest request);
    void delete(long id);
}
