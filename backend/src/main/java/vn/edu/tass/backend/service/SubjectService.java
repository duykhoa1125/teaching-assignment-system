package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.Subject;
import vn.edu.tass.backend.payload.request.SubjectRequest;

public interface SubjectService {
    List<Subject> list(int limit, int offset);
    Subject get(long id);
    Subject create(SubjectRequest request);
    Subject replace(long id, SubjectRequest request);
    void delete(long id);
}
