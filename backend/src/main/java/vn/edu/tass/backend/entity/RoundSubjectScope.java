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

@Entity
@Table(name = "round_subject_scope")
@Data
@NoArgsConstructor
public class RoundSubjectScope {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "round_id", nullable = false)
    private Long roundId;

    @Column(name = "grade_id", nullable = false)
    private Long gradeId;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    @Column(name = "confirmed_by")
    private Long confirmedBy;

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;
}