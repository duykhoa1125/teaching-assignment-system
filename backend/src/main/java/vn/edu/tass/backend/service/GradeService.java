package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.Grade;
import vn.edu.tass.backend.payload.request.GradeRequest;

public interface GradeService {
    List<Grade> list(int limit, int offset);
    Grade get(long id);
    Grade create(GradeRequest request);
    Grade replace(long id, GradeRequest request);
    void delete(long id);
}
