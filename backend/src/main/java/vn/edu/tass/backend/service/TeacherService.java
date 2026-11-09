package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.TeacherDto;
import vn.edu.tass.backend.payload.request.TeacherRequest;

public interface TeacherService {
    List<TeacherDto> retrieveAllTeacher(int limit, int offset);
    List<TeacherDto> searchTeacher(int limit, int offset, Long schoolId, String teacherCode, String q);
    TeacherDto retrieveById(long id);
    TeacherDto createTeacher(TeacherRequest request);
    TeacherDto updateTeacher(long id, TeacherRequest request);
    void deleteTeacher(long id);
}
