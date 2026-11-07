package vn.edu.tass.backend.entity;

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
@Table(name = "teacher_employment")
@Data
@NoArgsConstructor
public class TeacherEmployment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(name = "department_id", nullable = false)
    private Long departmentId;

    @Column(name = "semester_id", nullable = false)
    private Long semesterId;

    @Column(name = "employment_status", nullable = false)
    private String employmentStatus;

    @Column(name = "position_code", nullable = false)
    private String positionCode;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;
}