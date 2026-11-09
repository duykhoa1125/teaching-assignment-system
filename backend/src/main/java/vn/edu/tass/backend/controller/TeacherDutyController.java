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
import vn.edu.tass.backend.payload.dto.TeacherDutyDto;
import vn.edu.tass.backend.payload.request.TeacherDutyRequest;
import vn.edu.tass.backend.service.TeacherDutyService;

@RestController
@RequestMapping("/api/teacher-duties")
public class TeacherDutyController {
    private final TeacherDutyService service;

    public TeacherDutyController(TeacherDutyService service) {
        this.service = service;
    }

    @GetMapping
    public List<TeacherDutyDto> retrieveAllTeacherDuty(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(name = "teacher_id", required = false) Long teacherId,
            @RequestParam(name = "semester_id", required = false) Long semesterId,
            @RequestParam(name = "duty_type", required = false) String dutyType,
            @RequestParam(name = "verification_status", required = false) String verificationStatus,
            @RequestParam(name = "as_of", required = false) LocalDate asOf) {
        if (teacherId == null && semesterId == null && dutyType == null && verificationStatus == null && asOf == null) return service.retrieveAllTeacherDuty(limit, offset);
        return service.searchTeacherDuty(limit, offset, teacherId, semesterId, dutyType, verificationStatus, asOf);
    }

    @GetMapping("/{id}")
    public TeacherDutyDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<TeacherDutyDto> createTeacherDuty(@Valid @RequestBody TeacherDutyRequest request) {
        TeacherDutyDto created = service.createTeacherDuty(request);
        return ResponseEntity.created(URI.create("/api/teacher-duties/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public TeacherDutyDto updateTeacherDuty(@PathVariable long id, @Valid @RequestBody TeacherDutyRequest request) {
        return service.updateTeacherDuty(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeacherDuty(@PathVariable long id) {
        service.deleteTeacherDuty(id);
        return ResponseEntity.noContent().build();
    }
}
