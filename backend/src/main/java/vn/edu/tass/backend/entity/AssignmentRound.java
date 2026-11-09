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
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

@Entity
@Table(name = "assignment_round")
@Data
@NoArgsConstructor
public class AssignmentRound {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "semester_id", nullable = false)
    private Long semesterId;

    @Column(name = "round_code", nullable = false)
    private String roundCode;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "scope_confirmed_by")
    private Long scopeConfirmedBy;

    @Column(name = "scope_confirmed_at")
    private OffsetDateTime scopeConfirmedAt;

    @Column(name = "opens_at")
    private OffsetDateTime opensAt;

    @Column(name = "closes_at")
    private OffsetDateTime closesAt;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "source_revision_token", nullable = false, insertable = false, updatable = false)
    private String sourceRevisionToken;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "source_updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime sourceUpdatedAt;
}
