package vn.edu.tass.backend.payload.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonCreator;

/** Flat JSON body whose allowed fields depend on the requested resource. */
public record CrudRequest(Map<String, Object> fields) {
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public CrudRequest {}
}
