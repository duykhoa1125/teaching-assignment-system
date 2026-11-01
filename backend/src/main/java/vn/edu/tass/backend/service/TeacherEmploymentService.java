package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.TeacherEmployment;
import vn.edu.tass.backend.payload.request.TeacherEmploymentRequest;

public interface TeacherEmploymentService {
    List<TeacherEmployment> list(int limit, int offset);
    TeacherEmployment get(long id);
    TeacherEmployment create(TeacherEmploymentRequest request);
    TeacherEmployment replace(long id, TeacherEmploymentRequest request);
    void delete(long id);
}
