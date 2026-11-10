package vn.edu.tass.backend.service;
import java.time.LocalDate;
import java.util.List;
import vn.edu.tass.backend.payload.dto.TeacherWorkloadBasisDto;
import vn.edu.tass.backend.payload.request.TeacherWorkloadBasisRequest;

public interface TeacherWorkloadBasisService {
    List<TeacherWorkloadBasisDto> retrieveAllTeacherWorkloadBasis(int limit, int offset);
    List<TeacherWorkloadBasisDto> searchTeacherWorkloadBasis(int limit, int offset, Long teacherId, Long semesterId, Long educationLevelId, String verificationStatus, LocalDate asOf);
    TeacherWorkloadBasisDto retrieveById(long id);
    TeacherWorkloadBasisDto createTeacherWorkloadBasis(TeacherWorkloadBasisRequest request);
    TeacherWorkloadBasisDto updateTeacherWorkloadBasis(long id, TeacherWorkloadBasisRequest request);
    void deleteTeacherWorkloadBasis(long id);
}
