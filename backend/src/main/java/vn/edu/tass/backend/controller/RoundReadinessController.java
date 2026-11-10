package vn.edu.tass.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.tass.backend.payload.dto.RoundReadinessDto;
import vn.edu.tass.backend.service.RoundReadinessService;

@RestController
@RequestMapping("/api/assignment-rounds/{id}/readiness")
@RequiredArgsConstructor
public class RoundReadinessController {
    private final RoundReadinessService service;

    @GetMapping
    public RoundReadinessDto retrieveReadiness(@PathVariable long id) {
        return service.getReadiness(id);
    }
}
