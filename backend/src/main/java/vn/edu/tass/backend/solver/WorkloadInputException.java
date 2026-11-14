package vn.edu.tass.backend.solver;

/** Internal preparation failure with a stable code; HTTP mapping belongs to run preparation. */
public final class WorkloadInputException extends IllegalArgumentException {
    private final String code;
    private final String source;

    public WorkloadInputException(String code,String source,String message) {
        super(source+": "+message);
        this.code=code;
        this.source=source;
    }
    public String code() { return code; }
    public String source() { return source; }
    static void require(boolean valid,String code,String source,String message) {
        if (!valid) throw new WorkloadInputException(code,source,message);
    }
}
