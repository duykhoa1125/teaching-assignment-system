package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.SchoolClass;
import vn.edu.tass.backend.payload.request.SchoolClassRequest;

public interface SchoolClassService {
    List<SchoolClass> list(int limit, int offset);
    SchoolClass get(long id);
    SchoolClass create(SchoolClassRequest request);
    SchoolClass replace(long id, SchoolClassRequest request);
    void delete(long id);
}
