package vn.edu.tass.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "school_class")
@Data
@NoArgsConstructor
public class SchoolClass {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "academic_year_id", nullable = false)
    private Long academicYearId;

    @Column(name = "grade_id", nullable = false)
    private Long gradeId;

    @Column(name = "class_code", nullable = false)
    private String classCode;

    @Column(name = "status", nullable = false)
    private String status;
}