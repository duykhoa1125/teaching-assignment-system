package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.RequiredDemandComponentDto;
import vn.edu.tass.backend.payload.request.RequiredDemandComponentRequest;

public interface RequiredDemandComponentService {
    List<RequiredDemandComponentDto> retrieveAllRequiredDemandComponent(int limit, int offset);
    RequiredDemandComponentDto retrieveById(long id);
    RequiredDemandComponentDto createRequiredDemandComponent(RequiredDemandComponentRequest request);
    RequiredDemandComponentDto updateRequiredDemandComponent(long id, RequiredDemandComponentRequest request);
    void deleteRequiredDemandComponent(long id);
}
