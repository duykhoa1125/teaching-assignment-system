package vn.edu.tass.backend.entity;
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
@Table(name = "teaching_history")
@Data
@NoArgsConstructor
public class TeachingHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(name = "academic_year_id", nullable = false)
    private Long academicYearId;

    @Column(name = "semester_id", nullable = false)
    private Long semesterId;

    @Column(name = "class_id", nullable = false)
    private Long classId;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    @Column(name = "taught_from", nullable = false)
    private LocalDate taughtFrom;

    @Column(name = "taught_to", nullable = false)
    private LocalDate taughtTo;

    @Column(name = "source_kind", nullable = false)
    private String sourceKind;

    @Column(name = "source_import_id")
    private Long sourceImportId;

    @Column(name = "source_plan_demand_id")
    private Long sourcePlanDemandId;

    @Column(name = "evidence_ref", nullable = false)
    private String evidenceRef;

    @Column(name = "verification_status", nullable = false)
    private String verificationStatus;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;

    @Column(name = "recorded_by", nullable = false)
    private Long recordedBy;

    @CreationTimestamp
    @Column(name = "recorded_at", nullable = false)
    private OffsetDateTime recordedAt;
}
