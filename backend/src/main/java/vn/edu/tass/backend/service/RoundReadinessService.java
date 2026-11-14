package vn.edu.tass.backend.service;

import java.security.Principal;
import vn.edu.tass.backend.payload.dto.RoundReadinessDto;

public interface RoundReadinessService {
    /** Re-evaluate inside run preparation; a previous client GET is never authorization to run. */
    RoundReadinessDto check(long roundId, Long configId, Long rulesId, Principal principal);
}
