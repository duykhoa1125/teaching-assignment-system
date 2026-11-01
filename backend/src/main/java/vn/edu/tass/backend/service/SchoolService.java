package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.SchoolDto;
import vn.edu.tass.backend.payload.request.SchoolRequest;

public interface SchoolService {
    List<SchoolDto> retrieveAllSchool(int limit, int offset);
    SchoolDto retrieveById(long id);
    SchoolDto createSchool(SchoolRequest request);
    SchoolDto updateSchool(long id, SchoolRequest request);
    void deleteSchool(long id);
}