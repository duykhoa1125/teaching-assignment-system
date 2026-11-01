package vn.edu.tass.backend.payload.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonValue;

/** Keeps the existing flat JSON response while giving the HTTP layer a DTO. */
public record CrudResponse(Map<String, Object> fields) {
    @JsonValue
    public Map<String, Object> json() {
        return fields;
    }
}
