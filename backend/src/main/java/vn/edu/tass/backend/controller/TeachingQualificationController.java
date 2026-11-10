package vn.edu.tass.backend.controller;

import java.net.URI;
import java.util.List;
import java.time.LocalDate;
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
import vn.edu.tass.backend.payload.dto.TeachingQualificationDto;
import vn.edu.tass.backend.payload.request.TeachingQualificationRequest;
import vn.edu.tass.backend.service.TeachingQualificationService;

@RestController
@RequestMapping("/api/teaching-qualifications")
public class TeachingQualificationController {
    private final TeachingQualificationService service;

    public TeachingQualificationController(TeachingQualificationService service) {
        this.service = service;
    }

    @GetMapping
    public List<TeachingQualificationDto> retrieveAllTeachingQualification(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(name = "teacher_id", required = false) Long teacherId,
            @RequestParam(name = "subject_id", required = false) Long subjectId,
            @RequestParam(name = "education_level_id", required = false) Long educationLevelId,
            @RequestParam(name = "verification_status", required = false) String verificationStatus,
            @RequestParam(name = "as_of", required = false) LocalDate asOf) {
        if (teacherId == null && subjectId == null && educationLevelId == null && verificationStatus == null && asOf == null) return service.retrieveAllTeachingQualification(limit, offset);
        return service.searchTeachingQualification(limit, offset, teacherId, subjectId, educationLevelId, verificationStatus, asOf);
    }

    @GetMapping("/{id}")
    public TeachingQualificationDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<TeachingQualificationDto> createTeachingQualification(@Valid @RequestBody TeachingQualificationRequest request) {
        TeachingQualificationDto created = service.createTeachingQualification(request);
        return ResponseEntity.created(URI.create("/api/teaching-qualifications/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public TeachingQualificationDto updateTeachingQualification(@PathVariable long id, @Valid @RequestBody TeachingQualificationRequest request) {
        return service.updateTeachingQualification(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeachingQualification(@PathVariable long id) {
        service.deleteTeachingQualification(id);
        return ResponseEntity.noContent().build();
    }
}
