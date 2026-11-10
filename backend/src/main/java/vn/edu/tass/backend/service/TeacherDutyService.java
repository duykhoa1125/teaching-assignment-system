package vn.edu.tass.backend.service;
import java.time.LocalDate;
import java.util.List;
import vn.edu.tass.backend.payload.dto.TeacherDutyDto;
import vn.edu.tass.backend.payload.request.TeacherDutyRequest;

public interface TeacherDutyService {
    List<TeacherDutyDto> retrieveAllTeacherDuty(int limit, int offset);
    List<TeacherDutyDto> searchTeacherDuty(int limit, int offset, Long teacherId, Long semesterId, String dutyType, String verificationStatus, LocalDate asOf);
    TeacherDutyDto retrieveById(long id);
    TeacherDutyDto createTeacherDuty(TeacherDutyRequest request);
    TeacherDutyDto updateTeacherDuty(long id, TeacherDutyRequest request);
    void deleteTeacherDuty(long id);
}
