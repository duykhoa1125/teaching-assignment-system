package vn.edu.tass.backend.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.mapper.ClassSubjectApplicabilityMapper;
import vn.edu.tass.backend.mapper.RequiredDemandComponentMapper;
import vn.edu.tass.backend.mapper.TeachingDemandMapper;
import vn.edu.tass.backend.mapper.TeachingExperienceMapper;
import vn.edu.tass.backend.payload.request.ClassSubjectApplicabilityRequest;
import vn.edu.tass.backend.payload.request.RequiredDemandComponentRequest;
import vn.edu.tass.backend.payload.request.TeachingDemandRequest;
import vn.edu.tass.backend.payload.request.TeachingExperienceRequest;
import vn.edu.tass.backend.repository.ClassSubjectApplicabilityRepository;
import vn.edu.tass.backend.repository.RequiredDemandComponentRepository;
import vn.edu.tass.backend.repository.TeachingDemandRepository;
import vn.edu.tass.backend.repository.TeachingExperienceRepository;
import vn.edu.tass.backend.service.impl.ClassSubjectApplicabilityServiceImpl;
import vn.edu.tass.backend.service.impl.RequiredDemandComponentServiceImpl;
import vn.edu.tass.backend.service.impl.TeachingDemandServiceImpl;
import vn.edu.tass.backend.service.impl.TeachingExperienceServiceImpl;

class SchemaRulesTest {
    @Test
    void demandRejectsInvalidPeriodAndUnit() {
        var service = new TeachingDemandServiceImpl(mock(TeachingDemandRepository.class), new TeachingDemandMapper());
        var request = new TeachingDemandRequest();
        request.setDemandType("STANDARD");
        request.setUnit("PERIOD_PER_WEEK");
        request.setValidFrom(LocalDate.of(2026, 9, 1));
        request.setValidTo(LocalDate.of(2026, 12, 31));
        request.setPeriodsPerWeek(new BigDecimal("1.234"));
        assertThrows(BadRequestException.class, () -> service.createTeachingDemand(request));
        request.setPeriodsPerWeek(new BigDecimal("2.50"));
        request.setUnit("HOUR_PER_WEEK");
        assertThrows(BadRequestException.class, () -> service.createTeachingDemand(request));
        request.setUnit("PERIOD_PER_WEEK");
        request.setValidTo(LocalDate.of(2026, 8, 31));
        assertThrows(BadRequestException.class, () -> service.createTeachingDemand(request));
    }

    @Test
    void experienceDistinguishesUnknownZeroAndPositiveYears() {
        var service = new TeachingExperienceServiceImpl(mock(TeachingExperienceRepository.class), new TeachingExperienceMapper());
        var request = new TeachingExperienceRequest();
        request.setExperienceStatus("UNKNOWN");
        request.setYearsOfExperience(BigDecimal.ZERO);
        assertThrows(BadRequestException.class, () -> service.createTeachingExperience(request));
        request.setExperienceStatus("NO_EXPERIENCE");
        request.setYearsOfExperience(BigDecimal.ONE);
        assertThrows(BadRequestException.class, () -> service.createTeachingExperience(request));
        request.setExperienceStatus("HAS_EXPERIENCE");
        request.setYearsOfExperience(BigDecimal.ONE);
        assertThrows(BadRequestException.class, () -> service.createTeachingExperience(request));
    }

    @Test
    void applicabilityRequiresPairedConfirmations() {
        var service = new ClassSubjectApplicabilityServiceImpl(
            mock(ClassSubjectApplicabilityRepository.class), new ClassSubjectApplicabilityMapper());
        var request = new ClassSubjectApplicabilityRequest();
        request.setStatus("APPLICABLE");
        request.setConfirmedBy(1L);
        assertThrows(BadRequestException.class, () -> service.createClassSubjectApplicability(request));
        request.setConfirmedAt(OffsetDateTime.parse("2026-09-01T09:00:00+07:00"));
        request.setComponentsConfirmedAt(OffsetDateTime.parse("2026-09-01T09:00:00+07:00"));
        assertThrows(BadRequestException.class, () -> service.createClassSubjectApplicability(request));
    }

    @Test
    void requiredComponentRequiresValidDatesAndPairedConfirmation() {
        var service = new RequiredDemandComponentServiceImpl(
            mock(RequiredDemandComponentRepository.class), new RequiredDemandComponentMapper());
        var request = new RequiredDemandComponentRequest();
        request.setDemandType("STANDARD");
        request.setValidFrom(LocalDate.of(2026, 10, 1));
        request.setValidTo(LocalDate.of(2026, 9, 30));
        assertThrows(BadRequestException.class, () -> service.createRequiredDemandComponent(request));
        request.setValidTo(LocalDate.of(2026, 12, 31));
        request.setConfirmedBy(1L);
        assertThrows(BadRequestException.class, () -> service.createRequiredDemandComponent(request));
    }
}
