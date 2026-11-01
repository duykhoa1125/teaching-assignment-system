package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.TeachingQualification;
import vn.edu.tass.backend.payload.request.TeachingQualificationRequest;
import vn.edu.tass.backend.repository.TeachingQualificationRepository;
import vn.edu.tass.backend.service.TeachingQualificationService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class TeachingQualificationServiceImpl implements TeachingQualificationService {
    private final CrudSupport<TeachingQualification> crud;

    public TeachingQualificationServiceImpl(TeachingQualificationRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<TeachingQualification> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public TeachingQualification get(long id) { return crud.get(id); }

    @Transactional
    public TeachingQualification create(TeachingQualificationRequest request) { return crud.create(request); }

    @Transactional
    public TeachingQualification replace(long id, TeachingQualificationRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
