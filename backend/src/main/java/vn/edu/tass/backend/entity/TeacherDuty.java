package vn.edu.tass.backend.entity;
import java.time.LocalDate;
import java.math.BigDecimal;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "teacher_duty")
@Data
@NoArgsConstructor
public class TeacherDuty {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(name = "semester_id", nullable = false)
    private Long semesterId;

    @Column(name = "rule_definition_id", nullable = false)
    private Long ruleDefinitionId;

    @Column(name = "duty_type", nullable = false)
    private String dutyType;

    @Column(name = "class_id")
    private Long classId;

    @Column(name = "scope_description", nullable = false)
    private String scopeDescription;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "reduction_value")
    private BigDecimal reductionValue;

    @Column(name = "verification_status", nullable = false)
    private String verificationStatus;

    @Column(name = "payment_status", nullable = false)
    private String paymentStatus;

    @Column(name = "evidence_ref")
    private String evidenceRef;

    @Column(name = "verified_by")
    private Long verifiedBy;
}
