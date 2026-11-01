package vn.edu.tass.backend.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "teaching_demand")
@Data
@NoArgsConstructor
public class TeachingDemand {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "semester_id", nullable = false)
    private Long semesterId;

    @Column(name = "class_id", nullable = false)
    private Long classId;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    @Column(name = "periods_per_week", nullable = false)
    private BigDecimal periodsPerWeek;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "updated_by", nullable = false)
    private Long updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "demand_type", nullable = false)
    private String demandType;
}