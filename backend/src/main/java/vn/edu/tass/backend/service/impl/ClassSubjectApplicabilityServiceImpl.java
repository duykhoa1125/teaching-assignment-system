package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.ClassSubjectApplicability;
import vn.edu.tass.backend.payload.request.ClassSubjectApplicabilityRequest;
import vn.edu.tass.backend.repository.ClassSubjectApplicabilityRepository;
import vn.edu.tass.backend.service.ClassSubjectApplicabilityService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class ClassSubjectApplicabilityServiceImpl implements ClassSubjectApplicabilityService {
    private final CrudSupport<ClassSubjectApplicability> crud;

    public ClassSubjectApplicabilityServiceImpl(ClassSubjectApplicabilityRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<ClassSubjectApplicability> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public ClassSubjectApplicability get(long id) { return crud.get(id); }

    @Transactional
    public ClassSubjectApplicability create(ClassSubjectApplicabilityRequest request) { return crud.create(request); }

    @Transactional
    public ClassSubjectApplicability replace(long id, ClassSubjectApplicabilityRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
