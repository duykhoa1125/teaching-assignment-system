package vn.edu.tass.backend.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "teaching_experience")
@Data
@NoArgsConstructor
public class TeachingExperience {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    @Column(name = "grade_id", nullable = false)
    private Long gradeId;

    @Column(name = "recorded_by", nullable = false)
    private Long recordedBy;

    @CreationTimestamp
    @Column(name = "recorded_at", nullable = false)
    private OffsetDateTime recordedAt;

    @Column(name = "experience_status", nullable = false)
    private String experienceStatus;

    @Column(name = "years_of_experience")
    private BigDecimal yearsOfExperience;

    @Column(name = "as_of_date", nullable = false)
    private LocalDate asOfDate;

    @Column(name = "evidence_ref")
    private String evidenceRef;

    @Column(name = "source_import_id")
    private Long sourceImportId;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;
}
