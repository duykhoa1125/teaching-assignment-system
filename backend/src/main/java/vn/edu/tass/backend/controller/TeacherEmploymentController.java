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
import vn.edu.tass.backend.payload.dto.TeacherEmploymentDto;
import vn.edu.tass.backend.payload.request.TeacherEmploymentRequest;
import vn.edu.tass.backend.service.TeacherEmploymentService;

@RestController
@RequestMapping("/api/teacher-employments")
public class TeacherEmploymentController {
    private final TeacherEmploymentService service;

    public TeacherEmploymentController(TeacherEmploymentService service) {
        this.service = service;
    }

    @GetMapping
    public List<TeacherEmploymentDto> retrieveAllTeacherEmployment(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(name = "teacher_id", required = false) Long teacherId,
            @RequestParam(name = "department_id", required = false) Long departmentId,
            @RequestParam(name = "semester_id", required = false) Long semesterId,
            @RequestParam(name = "employment_status", required = false) String employmentStatus,
            @RequestParam(name = "as_of", required = false) LocalDate asOf) {
        if (teacherId == null && departmentId == null && semesterId == null && employmentStatus == null && asOf == null) return service.retrieveAllTeacherEmployment(limit, offset);
        return service.searchTeacherEmployment(limit, offset, teacherId, departmentId, semesterId, employmentStatus, asOf);
    }

    @GetMapping("/{id}")
    public TeacherEmploymentDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<TeacherEmploymentDto> createTeacherEmployment(@Valid @RequestBody TeacherEmploymentRequest request) {
        TeacherEmploymentDto created = service.createTeacherEmployment(request);
        return ResponseEntity.created(URI.create("/api/teacher-employments/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public TeacherEmploymentDto updateTeacherEmployment(@PathVariable long id, @Valid @RequestBody TeacherEmploymentRequest request) {
        return service.updateTeacherEmployment(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeacherEmployment(@PathVariable long id) {
        service.deleteTeacherEmployment(id);
        return ResponseEntity.noContent().build();
    }
}
