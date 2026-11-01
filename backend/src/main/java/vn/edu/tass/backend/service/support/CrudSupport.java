package vn.edu.tass.backend.service.support;

import java.util.List;

import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

public final class CrudSupport<E> {
    private final JdbcCrudRepository<E> repository;

    public CrudSupport(JdbcCrudRepository<E> repository) { this.repository = repository; }

    public List<E> list(int limit, int offset) {
        if (limit < 1 || limit > 100 || offset < 0)
            throw new BadRequestException("limit phải từ 1 đến 100 và offset phải >= 0");
        return repository.list(limit, offset);
    }

    public E get(long id) {
        requireId(id);
        return repository.get(id).orElseThrow(() -> missing(id));
    }

    public E create(Object request) {
        return repository.create(repository.metadata().requestValues(request));
    }

    public E replace(long id, Object request) {
        requireId(id);
        return repository.replace(id, repository.metadata().requestValues(request))
            .orElseThrow(() -> missing(id));
    }

    public void delete(long id) {
        requireId(id);
        if (repository.delete(id) == 0) throw missing(id);
    }

    private NotFoundException missing(long id) {
        return new NotFoundException("Không tìm thấy " + repository.metadata().table() + " với id=" + id);
    }

    private static void requireId(long id) {
        if (id < 1) throw new BadRequestException("id phải là số nguyên dương");
    }
}
