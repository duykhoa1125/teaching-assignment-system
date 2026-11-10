package vn.edu.tass.backend.controller;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.tass.backend.payload.dto.TeachingHistoryDto;
import vn.edu.tass.backend.payload.request.TeachingHistoryRequest;
import vn.edu.tass.backend.service.TeachingHistoryService;

@RestController
@RequestMapping("/api/teaching-histories")
public class TeachingHistoryController {
    private final TeachingHistoryService service;

    public TeachingHistoryController(TeachingHistoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<TeachingHistoryDto> retrieveAllTeachingHistory(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(name = "teacher_id", required = false) Long teacherId,
            @RequestParam(name = "semester_id", required = false) Long semesterId,
            @RequestParam(name = "class_id", required = false) Long classId,
            @RequestParam(name = "subject_id", required = false) Long subjectId,
            @RequestParam(name = "verification_status", required = false) String verificationStatus,
            @RequestParam(name = "as_of", required = false) LocalDate asOf) {
        if (teacherId == null && semesterId == null && classId == null && subjectId == null && verificationStatus == null && asOf == null) return service.retrieveAllTeachingHistory(limit, offset);
        return service.searchTeachingHistory(limit, offset, teacherId, semesterId, classId, subjectId, verificationStatus, asOf);
    }

    @GetMapping("/{id}")
    public TeachingHistoryDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<TeachingHistoryDto> createTeachingHistory(@Valid @RequestBody TeachingHistoryRequest request) {
        TeachingHistoryDto created = service.createTeachingHistory(request);
        return ResponseEntity.created(URI.create("/api/teaching-histories/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public TeachingHistoryDto updateTeachingHistory(@PathVariable long id, @Valid @RequestBody TeachingHistoryRequest request) {
        return service.updateTeachingHistory(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeachingHistory(@PathVariable long id) {
        service.deleteTeachingHistory(id);
        return ResponseEntity.noContent().build();
    }
}
