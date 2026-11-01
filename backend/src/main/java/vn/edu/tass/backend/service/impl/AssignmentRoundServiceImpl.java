package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.AssignmentRound;
import vn.edu.tass.backend.payload.request.AssignmentRoundRequest;
import vn.edu.tass.backend.repository.AssignmentRoundRepository;
import vn.edu.tass.backend.service.AssignmentRoundService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class AssignmentRoundServiceImpl implements AssignmentRoundService {
    private final CrudSupport<AssignmentRound> crud;

    public AssignmentRoundServiceImpl(AssignmentRoundRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<AssignmentRound> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public AssignmentRound get(long id) { return crud.get(id); }

    @Transactional
    public AssignmentRound create(AssignmentRoundRequest request) { return crud.create(request); }

    @Transactional
    public AssignmentRound replace(long id, AssignmentRoundRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
