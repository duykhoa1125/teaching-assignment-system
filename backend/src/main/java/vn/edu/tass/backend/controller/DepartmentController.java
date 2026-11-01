package vn.edu.tass.backend.controller;

import java.net.URI;
import java.util.List;

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

import vn.edu.tass.backend.entity.Department;
import vn.edu.tass.backend.payload.dto.DepartmentDto;
import vn.edu.tass.backend.payload.request.DepartmentRequest;
import vn.edu.tass.backend.service.DepartmentService;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {
    private final DepartmentService service;

    public DepartmentController(DepartmentService service) { this.service = service; }

    @GetMapping
    public List<DepartmentDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(DepartmentDto::from).toList();
    }

    @GetMapping("/{id}")
    public DepartmentDto get(@PathVariable long id) { return DepartmentDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<DepartmentDto> create(@RequestBody DepartmentRequest request) {
        Department created = service.create(request);
        return ResponseEntity.created(URI.create("/api/departments/" + created.id()))
            .body(DepartmentDto.from(created));
    }

    @PutMapping("/{id}")
    public DepartmentDto replace(@PathVariable long id, @RequestBody DepartmentRequest request) {
        return DepartmentDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
