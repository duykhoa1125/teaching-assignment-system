package vn.edu.tass.backend.service;

import vn.edu.tass.backend.payload.dto.RoundReadinessDto;

public interface RoundReadinessService {
    RoundReadinessDto getReadiness(long roundId);
}
