package vn.edu.tass.backend.utils;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public record OffsetLimitPageable(int limit, long offset) implements Pageable {
    public OffsetLimitPageable {
        CrudParameters.requirePage(limit, offset);
    }

    @Override public int getPageNumber() { return (int) (offset / limit); }
    @Override public int getPageSize() { return limit; }
    @Override public long getOffset() { return offset; }
    @Override public Sort getSort() { return Sort.by(Sort.Direction.ASC, "id"); }
    @Override public Pageable next() { return new OffsetLimitPageable(limit, offset + limit); }
    @Override public Pageable previousOrFirst() { return offset < limit ? first() : new OffsetLimitPageable(limit, offset - limit); }
    @Override public Pageable first() { return new OffsetLimitPageable(limit, 0); }
    @Override public Pageable withPage(int pageNumber) { return new OffsetLimitPageable(limit, Math.multiplyExact((long) pageNumber, limit)); }
    @Override public boolean hasPrevious() { return offset > 0; }
}
