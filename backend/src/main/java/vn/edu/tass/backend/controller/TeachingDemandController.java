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

import vn.edu.tass.backend.entity.TeachingDemand;
import vn.edu.tass.backend.payload.dto.TeachingDemandDto;
import vn.edu.tass.backend.payload.request.TeachingDemandRequest;
import vn.edu.tass.backend.service.TeachingDemandService;

@RestController
@RequestMapping("/api/teaching-demands")
public class TeachingDemandController {
    private final TeachingDemandService service;

    public TeachingDemandController(TeachingDemandService service) { this.service = service; }

    @GetMapping
    public List<TeachingDemandDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(TeachingDemandDto::from).toList();
    }

    @GetMapping("/{id}")
    public TeachingDemandDto get(@PathVariable long id) { return TeachingDemandDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<TeachingDemandDto> create(@RequestBody TeachingDemandRequest request) {
        TeachingDemand created = service.create(request);
        return ResponseEntity.created(URI.create("/api/teaching-demands/" + created.id()))
            .body(TeachingDemandDto.from(created));
    }

    @PutMapping("/{id}")
    public TeachingDemandDto replace(@PathVariable long id, @RequestBody TeachingDemandRequest request) {
        return TeachingDemandDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
