package vn.edu.tass.backend.service;

import java.util.List;
import java.time.LocalDate;
import vn.edu.tass.backend.payload.dto.SubjectDto;
import vn.edu.tass.backend.payload.request.SubjectRequest;

public interface SubjectService {
    List<SubjectDto> retrieveAllSubject(int limit, int offset);
    List<SubjectDto> searchSubject(int limit, int offset, String subjectCode, String q, LocalDate asOf);
    SubjectDto retrieveById(long id);
    SubjectDto createSubject(SubjectRequest request);
    SubjectDto updateSubject(long id, SubjectRequest request);
    void deleteSubject(long id);
}
