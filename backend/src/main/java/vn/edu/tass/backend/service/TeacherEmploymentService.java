package vn.edu.tass.backend.service;

import java.time.LocalDate;
import java.util.List;
import vn.edu.tass.backend.payload.dto.TeacherEmploymentDto;
import vn.edu.tass.backend.payload.request.TeacherEmploymentRequest;

public interface TeacherEmploymentService {
    List<TeacherEmploymentDto> retrieveAllTeacherEmployment(int limit, int offset);
    List<TeacherEmploymentDto> searchTeacherEmployment(int limit, int offset, Long teacherId, Long departmentId, Long semesterId, String employmentStatus, LocalDate asOf);
    TeacherEmploymentDto retrieveById(long id);
    TeacherEmploymentDto createTeacherEmployment(TeacherEmploymentRequest request);
    TeacherEmploymentDto updateTeacherEmployment(long id, TeacherEmploymentRequest request);
    void deleteTeacherEmployment(long id);
}
