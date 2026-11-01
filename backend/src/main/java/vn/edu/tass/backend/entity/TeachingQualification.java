package vn.edu.tass.backend.entity;

import java.time.OffsetDateTime;
import java.time.LocalDate;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "teaching_qualification")
@Data
@NoArgsConstructor
public class TeachingQualification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    @Column(name = "education_level_id", nullable = false)
    private Long educationLevelId;

    @Column(name = "verification_status", nullable = false)
    private String verificationStatus;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;

    @Column(name = "evidence_ref")
    private String evidenceRef;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;
}