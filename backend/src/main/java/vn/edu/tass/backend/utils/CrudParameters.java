package vn.edu.tass.backend.utils;

import vn.edu.tass.backend.exception.BadRequestException;

public final class CrudParameters {
    private CrudParameters() {}

    public static void requirePage(int limit, long offset) {
        if (limit < 1 || limit > 100 || offset < 0) {
            throw new BadRequestException("limit must be between 1 and 100 and offset must be nonnegative");
        }
    }

    public static void requireId(long id) {
        if (id < 1) throw new BadRequestException("id must be positive");
    }
}
