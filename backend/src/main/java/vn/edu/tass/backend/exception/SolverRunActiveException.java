package vn.edu.tass.backend.exception;

import org.springframework.http.HttpStatus;

public class SolverRunActiveException extends PlanOperationException {
    private final long runId;
    public SolverRunActiveException(long runId) {
        super(HttpStatus.CONFLICT,"SOLVER_RUN_ACTIVE","DRAFT đã có một lượt đang chờ hoặc đang chạy; theo dõi Location của phản hồi này.");
        this.runId=runId;
    }
    public long getRunId() { return runId; }
}
