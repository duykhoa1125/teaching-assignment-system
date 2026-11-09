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

@Entity
@Table(name = "teacher_workload_basis")
@Data
@NoArgsConstructor
public class TeacherWorkloadBasis {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(name = "semester_id", nullable = false)
    private Long semesterId;

    @Column(name = "education_level_id", nullable = false)
    private Long educationLevelId;

    @Column(name = "position_code", nullable = false)
    private String positionCode;

    @Column(name = "base_periods_per_week", nullable = false)
    private BigDecimal basePeriodsPerWeek;

    @Column(name = "unit", nullable = false)
    private String unit;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to", nullable = false)
    private LocalDate validTo;

    @Column(name = "profile_ref", nullable = false)
    private String profileRef;

    @Column(name = "rule_definition_id")
    private Long ruleDefinitionId;

    @Column(name = "source_import_id")
    private Long sourceImportId;

    @Column(name = "verification_status", nullable = false)
    private String verificationStatus;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;
}
