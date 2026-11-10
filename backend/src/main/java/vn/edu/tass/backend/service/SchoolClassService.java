package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.SchoolClassDto;
import vn.edu.tass.backend.payload.request.SchoolClassRequest;

public interface SchoolClassService {
    List<SchoolClassDto> retrieveAllSchoolClass(int limit, int offset);
    List<SchoolClassDto> searchSchoolClass(int limit, int offset, Long academicYearId, Long gradeId, String status);
    SchoolClassDto retrieveById(long id);
    SchoolClassDto createSchoolClass(SchoolClassRequest request);
    SchoolClassDto updateSchoolClass(long id, SchoolClassRequest request);
    void deleteSchoolClass(long id);
}
