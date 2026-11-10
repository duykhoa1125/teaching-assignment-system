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
import vn.edu.tass.backend.payload.dto.RequiredDemandComponentDto;
import vn.edu.tass.backend.payload.request.RequiredDemandComponentRequest;
import vn.edu.tass.backend.service.RequiredDemandComponentService;

@RestController
@RequestMapping("/api/required-demand-components")
public class RequiredDemandComponentController {
    private final RequiredDemandComponentService service;

    public RequiredDemandComponentController(RequiredDemandComponentService service) {
        this.service = service;
    }

    @GetMapping
    public List<RequiredDemandComponentDto> retrieveAllRequiredDemandComponent(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(name = "applicability_id", required = false) Long applicabilityId,
            @RequestParam(name = "demand_type", required = false) String demandType,
            @RequestParam(name = "as_of", required = false) LocalDate asOf) {
        if (applicabilityId == null && demandType == null && asOf == null) return service.retrieveAllRequiredDemandComponent(limit, offset);
        return service.searchRequiredDemandComponent(limit, offset, applicabilityId, demandType, asOf);
    }

    @GetMapping("/{id}")
    public RequiredDemandComponentDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<RequiredDemandComponentDto> createRequiredDemandComponent(
            @Valid @RequestBody RequiredDemandComponentRequest request) {
        RequiredDemandComponentDto created = service.createRequiredDemandComponent(request);
        return ResponseEntity.created(URI.create("/api/required-demand-components/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public RequiredDemandComponentDto updateRequiredDemandComponent(@PathVariable long id,
            @Valid @RequestBody RequiredDemandComponentRequest request) {
        return service.updateRequiredDemandComponent(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRequiredDemandComponent(@PathVariable long id) {
        service.deleteRequiredDemandComponent(id);
        return ResponseEntity.noContent().build();
    }
}
