package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.AcademicYear;
import vn.edu.tass.backend.payload.request.AcademicYearRequest;
import vn.edu.tass.backend.repository.AcademicYearRepository;
import vn.edu.tass.backend.service.AcademicYearService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class AcademicYearServiceImpl implements AcademicYearService {
    private final CrudSupport<AcademicYear> crud;

    public AcademicYearServiceImpl(AcademicYearRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<AcademicYear> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public AcademicYear get(long id) { return crud.get(id); }

    @Transactional
    public AcademicYear create(AcademicYearRequest request) { return crud.create(request); }

    @Transactional
    public AcademicYear replace(long id, AcademicYearRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
