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
@Table(name = "grade")
@Data
@NoArgsConstructor
public class Grade {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "education_level_id", nullable = false)
    private Long educationLevelId;

    @Column(name = "grade_code", nullable = false)
    private String gradeCode;

    @Column(name = "name", nullable = false)
    private String name;
}