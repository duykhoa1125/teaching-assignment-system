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

    @Column(name = "grade_id")
    private Long gradeId;

    @Column(name = "experience_level", nullable = false)
    private String experienceLevel;

    @Column(name = "experience_period", nullable = false)
    private String experiencePeriod;

    @Column(name = "recorded_by", nullable = false)
    private Long recordedBy;

    @CreationTimestamp
    @Column(name = "recorded_at", nullable = false)
    private OffsetDateTime recordedAt;
}