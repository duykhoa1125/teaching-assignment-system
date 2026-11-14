package vn.edu.tass.backend.controller;

import java.security.Principal;
import org.springframework.web.bind.annotation.*;
import vn.edu.tass.backend.payload.dto.RoundReadinessDto;
import vn.edu.tass.backend.service.RoundReadinessService;

@RestController
@RequestMapping("/api/assignment-rounds")
public class RoundReadinessController {
    private final RoundReadinessService readiness;

    public RoundReadinessController(RoundReadinessService readiness) { this.readiness = readiness; }

    @GetMapping("/{id}/readiness")
    public RoundReadinessDto check(@PathVariable("id") long id,
            @RequestParam(name="optimization_config_id",required=false) Long configId,
            @RequestParam(name="rule_set_version_id",required=false) Long rulesId, Principal principal) {
        return readiness.check(id,configId,rulesId,principal);
    }
}
