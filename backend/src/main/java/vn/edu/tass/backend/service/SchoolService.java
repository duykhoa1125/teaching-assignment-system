package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.School;
import vn.edu.tass.backend.payload.request.SchoolRequest;

public interface SchoolService {
    List<School> list(int limit, int offset);
    School get(long id);
    School create(SchoolRequest request);
    School replace(long id, SchoolRequest request);
    void delete(long id);
}
