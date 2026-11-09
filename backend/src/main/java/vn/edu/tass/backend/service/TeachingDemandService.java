package vn.edu.tass.backend.service;

import java.util.List;
import java.time.LocalDate;
import vn.edu.tass.backend.payload.dto.TeachingDemandDto;
import vn.edu.tass.backend.payload.request.TeachingDemandRequest;

public interface TeachingDemandService {
    List<TeachingDemandDto> retrieveAllTeachingDemand(int limit, int offset);
    List<TeachingDemandDto> searchTeachingDemand(int limit, int offset, Long semesterId, Long classId, Long subjectId, String demandType, String status, LocalDate asOf);
    TeachingDemandDto retrieveById(long id);
    TeachingDemandDto createTeachingDemand(TeachingDemandRequest request);
    TeachingDemandDto updateTeachingDemand(long id, TeachingDemandRequest request);
    void deleteTeachingDemand(long id);
}
