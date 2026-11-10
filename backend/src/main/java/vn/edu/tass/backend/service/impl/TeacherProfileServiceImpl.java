package vn.edu.tass.backend.service.impl;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.TeachingExperience;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.mapper.TeacherProfileMapper;
import vn.edu.tass.backend.payload.dto.TeacherProfileDto;
import vn.edu.tass.backend.repository.AcademicYearRepository;
import vn.edu.tass.backend.repository.SemesterRepository;
import vn.edu.tass.backend.repository.TeacherDutyRepository;
import vn.edu.tass.backend.repository.TeacherEmploymentRepository;
import vn.edu.tass.backend.repository.TeacherRepository;
import vn.edu.tass.backend.repository.TeacherWorkloadBasisRepository;
import vn.edu.tass.backend.repository.TeachingExperienceRepository;
import vn.edu.tass.backend.repository.TeachingHistoryRepository;
import vn.edu.tass.backend.repository.TeachingQualificationRepository;
import vn.edu.tass.backend.service.TeacherProfileService;
import vn.edu.tass.backend.utils.CrudParameters;

@Service
@RequiredArgsConstructor
public class TeacherProfileServiceImpl implements TeacherProfileService {
    private final TeacherRepository teacherRepository;
    private final SemesterRepository semesterRepository;
    private final AcademicYearRepository academicYearRepository;
    private final TeacherEmploymentRepository employmentRepository;
    private final TeachingQualificationRepository qualificationRepository;
    private final TeachingExperienceRepository experienceRepository;
    private final TeachingHistoryRepository historyRepository;
    private final TeacherWorkloadBasisRepository workloadBasisRepository;
    private final TeacherDutyRepository dutyRepository;
    private final TeacherProfileMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public TeacherProfileDto getProfile(long teacherId, long semesterId) {
        CrudParameters.requireId(teacherId);
        CrudParameters.requireId(semesterId);
        var teacher = teacherRepository.findById(teacherId)
            .orElseThrow(() -> new NotFoundException("teacher id=" + teacherId + " does not exist"));
        var semester = semesterRepository.findById(semesterId)
            .orElseThrow(() -> new NotFoundException("semester id=" + semesterId + " does not exist"));
        var academicYear = academicYearRepository.findById(semester.getAcademicYearId())
            .orElseThrow(() -> new NotFoundException("academic_year id=" + semester.getAcademicYearId() + " does not exist"));
        if (!teacher.getSchoolId().equals(academicYear.getSchoolId())) {
            throw new BadRequestException("semester_id does not belong to the teacher's school");
        }

        var startsOn = semester.getStartsOn();
        var endsOn = semester.getEndsOn();
        List<TeachingExperience> experiences = experienceRepository
            .findByTeacherIdAndAsOfDateLessThanEqualOrderByAsOfDateDescIdDesc(teacherId, endsOn);
        Set<ExperienceKey> seen = new HashSet<>();
        List<TeachingExperience> latestExperiences = experiences.stream()
            .filter(e -> seen.add(new ExperienceKey(e.getSubjectId(), e.getGradeId())))
            .toList();

        return mapper.toDto(teacher, semester,
            employmentRepository.findForProfile(teacherId, semesterId, startsOn, endsOn),
            qualificationRepository.findForProfile(teacherId, startsOn, endsOn),
            latestExperiences,
            historyRepository.findForProfile(teacherId, endsOn),
            workloadBasisRepository.findForProfile(teacherId, semesterId, startsOn, endsOn),
            dutyRepository.findForProfile(teacherId, semesterId, startsOn, endsOn));
    }

    private record ExperienceKey(Long subjectId, Long gradeId) {
    }
}
