package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.Semester;
import vn.edu.tass.backend.payload.request.SemesterRequest;

public interface SemesterService {
    List<Semester> list(int limit, int offset);
    Semester get(long id);
    Semester create(SemesterRequest request);
    Semester replace(long id, SemesterRequest request);
    void delete(long id);
}
