package vn.edu.tass.backend.service.impl;

import java.security.Principal;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import vn.edu.tass.backend.exception.PlanOperationException;
import vn.edu.tass.backend.service.PlanActorResolver;

/** Provisional login_name mapping, isolated until the team's auth principal is finalized. */
@Component
public class PrincipalPlanActorResolver implements PlanActorResolver {
    private final JdbcTemplate jdbc;

    public PrincipalPlanActorResolver(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public long requireActor(Principal principal) {
        if (principal == null) {
            throw new PlanOperationException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập để truy cập phương án.");
        }
        var accounts = jdbc.queryForList(
            "SELECT id FROM user_account WHERE login_name=? AND status='ACTIVE'", Long.class, principal.getName());
        if (accounts.size() != 1) {
            throw new PlanOperationException(HttpStatus.FORBIDDEN, "PLAN_ACCESS_DENIED", "Tài khoản không hoạt động hoặc chưa được liên kết.");
        }
        return accounts.get(0);
    }
}
