package vn.edu.tass.backend.controller;

import java.net.URI;
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
import vn.edu.tass.backend.payload.dto.DepartmentDto;
import vn.edu.tass.backend.payload.request.DepartmentRequest;
import vn.edu.tass.backend.service.DepartmentService;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {
    private final DepartmentService service;

    public DepartmentController(DepartmentService service) {
        this.service = service;
    }

    @GetMapping
    public List<DepartmentDto> retrieveAllDepartment(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.retrieveAllDepartment(limit, offset);
    }

    @GetMapping("/{id}")
    public DepartmentDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<DepartmentDto> createDepartment(@Valid @RequestBody DepartmentRequest request) {
        DepartmentDto created = service.createDepartment(request);
        return ResponseEntity.created(URI.create("/api/departments/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public DepartmentDto updateDepartment(@PathVariable long id, @Valid @RequestBody DepartmentRequest request) {
        return service.updateDepartment(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDepartment(@PathVariable long id) {
        service.deleteDepartment(id);
        return ResponseEntity.noContent().build();
    }
}