package vn.edu.tass.backend.controller;

import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.tass.backend.payload.dto.PlanAssignmentDto;
import vn.edu.tass.backend.payload.dto.PlanAssignmentUpdateDto;
import vn.edu.tass.backend.payload.request.UpdatePlanAssignmentRequest;
import vn.edu.tass.backend.service.PlanAssignmentService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/plan-versions/{id}/assignments")
@RequiredArgsConstructor
public class PlanAssignmentController {
    private final PlanAssignmentService service;

    @GetMapping
    public List<PlanAssignmentDto> retrieve(@PathVariable long id,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") long offset,
            @RequestParam(name = "teacher_id", required = false) Long teacherId,
            @RequestParam(name = "class_id", required = false) Long classId,
            @RequestParam(name = "subject_id", required = false) Long subjectId,
            @RequestParam(name = "demand_type", required = false) String demandType,
            @RequestParam(name = "as_of", required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
        return service.retrieve(id, limit, offset, teacherId, classId, subjectId, demandType, asOf);
    }

    @PatchMapping("/{demand_id}")
    public PlanAssignmentUpdateDto update(@PathVariable long id,
            @PathVariable(name = "demand_id") long demandId,
            @Valid @RequestBody UpdatePlanAssignmentRequest request) {
        return service.update(id, demandId, request);
    }
}
