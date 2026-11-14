package vn.edu.tass.backend.solver;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import static vn.edu.tass.backend.solver.WorkloadInputException.require;

/** Explicit readers for the snake_case DB snapshot; this is not a solver DTO. */
final class CapturedWorkloadData {
    private CapturedWorkloadData() {}

    static String text(JsonNode row,String key) {
        var value=row.path(key);
        require(value.isTextual() && !value.textValue().isBlank(),"MISSING_SOURCE_FIELD",key,"Nonblank source text required");
        return value.textValue();
    }
    static long id(JsonNode row,String key) {
        var value=row.path(key);
        require(value.isIntegralNumber() && value.canConvertToLong() && value.longValue()>0,"INVALID_SOURCE_ID",key,"Positive source ID required");
        return value.longValue();
    }
    static BigDecimal number(JsonNode row,String key) {
        var value=row.path(key);
        require(value.isNumber(),"MISSING_SOURCE_NUMBER",key,"Explicit decimal required; unknown is not zero");
        return value.decimalValue();
    }
    static LocalDate date(JsonNode row,String key) {
        try { return LocalDate.parse(text(row,key)); }
        catch (java.time.format.DateTimeParseException e) { throw new WorkloadInputException("INVALID_SOURCE_DATE",key,"Expected ISO date"); }
    }
    static List<JsonNode> rows(JsonNode row,String key) {
        var value=row.path(key);
        require(value.isArray(),"MISSING_SOURCE_ARRAY",key,"Captured array required");
        List<JsonNode> result=new ArrayList<>(); value.forEach(result::add);
        return List.copyOf(result);
    }
    static Map<Long,JsonNode> index(JsonNode root,String key) {
        Map<Long,JsonNode> result=new TreeMap<>();
        for (var row:rows(root,key)) require(result.put(id(row,"id"),row)==null,"DUPLICATE_SOURCE_ID",key,"Repeated source ID");
        return result;
    }
    static boolean overlaps(JsonNode row,LocalDate start,LocalDate end) {
        return !date(row,"valid_from").isAfter(end) && !end(row,end).isBefore(start);
    }
    static LocalDate end(JsonNode row,LocalDate fallback) {
        return row.path("valid_to").isNull() || row.path("valid_to").isMissingNode()?fallback:date(row,"valid_to");
    }
    static boolean covers(JsonNode row,LocalDate start,LocalDate end) {
        return !date(row,"valid_from").isAfter(start) && !end(row,end).isBefore(end);
    }
    static String ref(String table,JsonNode row) { return table+"#"+id(row,"id"); }
    static void verified(JsonNode row,String actor,String timestamp,String evidence) {
        require("VERIFIED".equals(text(row,"verification_status")),"SOURCE_NOT_VERIFIED",evidence,"Source is not VERIFIED");
        if (actor!=null) id(row,actor);
        if (timestamp!=null) {
            try { OffsetDateTime.parse(text(row,timestamp)); }
            catch (java.time.format.DateTimeParseException e) { throw new WorkloadInputException("INVALID_CONFIRMATION_TIME",timestamp,"Expected timestamp with offset"); }
        }
        text(row,evidence);
    }
    static Set<Long> ids(JsonNode row,String key) {
        Set<Long> result=new TreeSet<>();
        for (var value:rows(row,key)) {
            require(value.isIntegralNumber() && value.canConvertToLong() && value.longValue()>0,"INVALID_SOURCE_ID",key,"Positive source ID required");
            require(result.add(value.longValue()),"DUPLICATE_SOURCE_ID",key,"Repeated source ID");
        }
        return Collections.unmodifiableSet(result);
    }
}
