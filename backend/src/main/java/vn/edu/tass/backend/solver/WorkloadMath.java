package vn.edu.tass.backend.solver;

import java.math.BigDecimal;
import vn.edu.tass.solver.Contract;
import static vn.edu.tass.backend.solver.WorkloadInputException.require;

/** Shared decimal accounting for solver, manual edits, workload reads and post-validation. */
public final class WorkloadMath {
    private WorkloadMath() {}

    public static Contract.Load evaluate(String teacherId,Contract.Workload w,BigDecimal assigned) {
        nonnegative(w.base(),"B"); nonnegative(w.reduction(),"R");
        nonnegative(w.fixedOutside(),"F"); nonnegative(w.converted(),"C"); nonnegative(assigned,"A");
        BigDecimal q=w.base().subtract(w.reduction()).max(BigDecimal.ZERO);
        BigDecimal totalTeaching=assigned.add(w.fixedOutside()).add(w.converted());
        BigDecimal total=totalTeaching.add(w.reduction());
        BigDecimal delta=w.targetApplicable()?total.subtract(w.base()):null;
        return new Contract.Load(teacherId,w.base(),w.reduction(),w.targetApplicable()?q:null,assigned,
            w.fixedOutside(),w.converted(),totalTeaching,
            w.targetApplicable()?assigned.subtract(q):null,w.targetApplicable()?totalTeaching.subtract(q):null,
            delta==null?null:delta.negate().max(BigDecimal.ZERO),delta==null?null:delta.max(BigDecimal.ZERO),
            w.targetApplicable(),total,delta);
    }

    static void nonnegative(BigDecimal value,String source) {
        require(value!=null && value.signum()>=0,"MISSING_OR_INVALID_LOAD",source,"An explicit nonnegative decimal is required; unknown is not zero");
    }
}
