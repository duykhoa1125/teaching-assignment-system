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
import vn.edu.tass.backend.payload.dto.TeacherWorkloadBasisDto;
import vn.edu.tass.backend.payload.request.TeacherWorkloadBasisRequest;
import vn.edu.tass.backend.service.TeacherWorkloadBasisService;

@RestController
@RequestMapping("/api/teacher-workload-bases")
public class TeacherWorkloadBasisController {
    private final TeacherWorkloadBasisService service;

    public TeacherWorkloadBasisController(TeacherWorkloadBasisService service) {
        this.service = service;
    }

    @GetMapping
    public List<TeacherWorkloadBasisDto> retrieveAllTeacherWorkloadBasis(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(name = "teacher_id", required = false) Long teacherId,
            @RequestParam(name = "semester_id", required = false) Long semesterId,
            @RequestParam(name = "education_level_id", required = false) Long educationLevelId,
            @RequestParam(name = "verification_status", required = false) String verificationStatus,
            @RequestParam(name = "as_of", required = false) LocalDate asOf) {
        if (teacherId == null && semesterId == null && educationLevelId == null && verificationStatus == null && asOf == null) return service.retrieveAllTeacherWorkloadBasis(limit, offset);
        return service.searchTeacherWorkloadBasis(limit, offset, teacherId, semesterId, educationLevelId, verificationStatus, asOf);
    }

    @GetMapping("/{id}")
    public TeacherWorkloadBasisDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<TeacherWorkloadBasisDto> createTeacherWorkloadBasis(@Valid @RequestBody TeacherWorkloadBasisRequest request) {
        TeacherWorkloadBasisDto created = service.createTeacherWorkloadBasis(request);
        return ResponseEntity.created(URI.create("/api/teacher-workload-bases/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public TeacherWorkloadBasisDto updateTeacherWorkloadBasis(@PathVariable long id, @Valid @RequestBody TeacherWorkloadBasisRequest request) {
        return service.updateTeacherWorkloadBasis(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeacherWorkloadBasis(@PathVariable long id) {
        service.deleteTeacherWorkloadBasis(id);
        return ResponseEntity.noContent().build();
    }
}
