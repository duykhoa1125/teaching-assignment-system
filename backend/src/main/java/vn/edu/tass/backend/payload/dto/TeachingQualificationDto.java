package vn.edu.tass.backend.payload.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.TeachingQualification;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeachingQualificationDto(
    Long id,
    Long teacherId,
    Long subjectId,
    Long educationLevelId,
    String verificationStatus,
    Long verifiedBy,
    OffsetDateTime verifiedAt,
    String evidenceRef,
    LocalDate validFrom,
    LocalDate validTo
) {
    public static TeachingQualificationDto from(TeachingQualification entity) {
        return new TeachingQualificationDto(entity.id(), entity.teacherId(), entity.subjectId(), entity.educationLevelId(), entity.verificationStatus(), entity.verifiedBy(), entity.verifiedAt(), entity.evidenceRef(), entity.validFrom(), entity.validTo());
    }
}
