package vn.edu.tass.backend.mapper;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.Semester;
import vn.edu.tass.backend.entity.Teacher;
import vn.edu.tass.backend.entity.TeacherDuty;
import vn.edu.tass.backend.entity.TeacherEmployment;
import vn.edu.tass.backend.entity.TeacherWorkloadBasis;
import vn.edu.tass.backend.entity.TeachingExperience;
import vn.edu.tass.backend.entity.TeachingHistory;
import vn.edu.tass.backend.entity.TeachingQualification;
import vn.edu.tass.backend.payload.dto.TeacherProfileDto;

@Component
@RequiredArgsConstructor
public class TeacherProfileMapper {
    private final TeacherMapper teacherMapper;
    private final SemesterMapper semesterMapper;
    private final TeacherEmploymentMapper employmentMapper;
    private final TeachingQualificationMapper qualificationMapper;
    private final TeachingExperienceMapper experienceMapper;
    private final TeachingHistoryMapper historyMapper;
    private final TeacherWorkloadBasisMapper workloadBasisMapper;
    private final TeacherDutyMapper dutyMapper;

    public TeacherProfileDto toDto(Teacher teacher, Semester semester,
            List<TeacherEmployment> employments, List<TeachingQualification> qualifications,
            List<TeachingExperience> experiences, List<TeachingHistory> histories,
            List<TeacherWorkloadBasis> workloadBases, List<TeacherDuty> duties) {
        return new TeacherProfileDto(
            teacherMapper.toDto(teacher), semesterMapper.toDto(semester),
            employments.stream().map(employmentMapper::toDto).toList(),
            qualifications.stream().map(qualificationMapper::toDto).toList(),
            experiences.stream().map(experienceMapper::toDto).toList(),
            histories.stream().map(historyMapper::toDto).toList(),
            workloadBases.stream().map(workloadBasisMapper::toDto).toList(),
            duties.stream().map(dutyMapper::toDto).toList()
        );
    }
}
