package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.Teacher;
import vn.edu.tass.backend.payload.request.TeacherRequest;

public interface TeacherService {
    List<Teacher> list(int limit, int offset);
    Teacher get(long id);
    Teacher create(TeacherRequest request);
    Teacher replace(long id, TeacherRequest request);
    void delete(long id);
}
