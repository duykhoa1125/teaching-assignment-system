package vn.edu.tass.backend.entity;

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
@Table(name = "class_subject_applicability")
@Data
@NoArgsConstructor
public class ClassSubjectApplicability {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "scope_id", nullable = false)
    private Long scopeId;

    @Column(name = "class_id", nullable = false)
    private Long classId;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "reason")
    private String reason;

    @Column(name = "updated_by", nullable = false)
    private Long updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "confirmed_by")
    private Long confirmedBy;

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;

    @Column(name = "components_confirmed_by")
    private Long componentsConfirmedBy;

    @Column(name = "components_confirmed_at")
    private OffsetDateTime componentsConfirmedAt;
}
