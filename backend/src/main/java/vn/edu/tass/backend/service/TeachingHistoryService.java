package vn.edu.tass.backend.service;
import java.time.LocalDate;
import java.util.List;
import vn.edu.tass.backend.payload.dto.TeachingHistoryDto;
import vn.edu.tass.backend.payload.request.TeachingHistoryRequest;

public interface TeachingHistoryService {
    List<TeachingHistoryDto> retrieveAllTeachingHistory(int limit, int offset);
    List<TeachingHistoryDto> searchTeachingHistory(int limit, int offset, Long teacherId, Long semesterId, Long classId, Long subjectId, String verificationStatus, LocalDate asOf);
    TeachingHistoryDto retrieveById(long id);
    TeachingHistoryDto createTeachingHistory(TeachingHistoryRequest request);
    TeachingHistoryDto updateTeachingHistory(long id, TeachingHistoryRequest request);
    void deleteTeachingHistory(long id);
}
