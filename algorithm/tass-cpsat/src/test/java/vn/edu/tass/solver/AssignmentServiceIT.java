package vn.edu.tass.solver;

import org.junit.jupiter.api.Test;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static vn.edu.tass.solver.Fixtures.*;
import static vn.edu.tass.solver.AssignmentService.*;

class AssignmentServiceIT {
    @Test void nativeSolveValidateAndAtomicApplyKeepsDraft() throws Exception {
        var input=base();var result=new AssignmentSolver().solve(input);var store=new InMemoryPlanStore(input);var service=new AssignmentService(store);
        assertEquals(ApplyOutcome.APPLIED,service.apply(input,result,new Cancellation()).outcome());assertEquals(1,store.revision());assertEquals("DRAFT",store.state());assertEquals(2,store.saved().size());
        assertEquals(ApplyOutcome.STALE,service.apply(input,result,new Cancellation()).outcome());assertEquals(1,store.revision());
    }
    @Test void poc15TwoConcurrentAppliesExactlyOneWins() throws Exception {
        var input=base();var result=new AssignmentSolver().solve(input);var store=new InMemoryPlanStore(input);var service=new AssignmentService(store);var pool=Executors.newFixedThreadPool(2);var barrier=new CyclicBarrier(2);
        try {Callable<ApplyOutcome> task=()->{barrier.await();return service.apply(input,result,new Cancellation()).outcome();};var a=pool.submit(task);var b=pool.submit(task);assertEquals(Set.of(ApplyOutcome.APPLIED,ApplyOutcome.STALE),Set.of(a.get(5,TimeUnit.SECONDS),b.get(5,TimeUnit.SECONDS)));assertEquals(1,store.revision());}finally{pool.shutdownNow();}
    }
    @Test void poc15ChangedSourceTokenOrVersionOrStateRejectsLateResult() throws Exception {
        var input=base();var result=new AssignmentSolver().solve(input);
        for(String path:List.of("/identity/sourceRevisionToken","/identity/versionId","/identity/snapshotId")) {
            var changed=tree();set(changed,path,"CHANGED");var store=new InMemoryPlanStore(input);store.replaceCurrent(read(changed),"DRAFT");assertEquals(ApplyOutcome.STALE,new AssignmentService(store).apply(input,result,new Cancellation()).outcome());assertTrue(store.saved().isEmpty());
        }
        var store=new InMemoryPlanStore(input);store.replaceCurrent(input,"OPEN_FOR_FEEDBACK");assertEquals(ApplyOutcome.NOT_DRAFT,new AssignmentService(store).apply(input,result,new Cancellation()).outcome());
    }
    @Test void snapshotPayloadChangeEvenWithSameIdentityIsRejected() throws Exception {
        var input=base();var result=new AssignmentSolver().solve(input);var changed=tree();set(changed,"/teachers/0/name","Changed display name");var store=new InMemoryPlanStore(read(changed));assertEquals(ApplyOutcome.STALE,new AssignmentService(store).apply(input,result,new Cancellation()).outcome());
    }
    @Test void cancellationAndFailurePreserveSavedAssignments() throws Exception {
        var input=base();var result=new AssignmentSolver().solve(input);var store=new InMemoryPlanStore(input);var service=new AssignmentService(store);service.apply(input,result,new Cancellation());var saved=store.saved();
        var token=new Cancellation();token.cancel();assertEquals(ApplyOutcome.CANCELLED,service.apply(input,result,token).outcome());
        var bad=tree();set(bad,"/demands/0/periods",0);var failure=new AssignmentSolver().solve(read(bad));assertEquals(ApplyOutcome.NO_CANDIDATE,service.apply(input,failure,new Cancellation()).outcome());assertEquals(saved,store.saved());assertEquals(1,store.revision());
    }
    @Test void partialDraftCanBeAppliedButCannotPassOpeningDataGuard() throws Exception {
        var input=read(oneTeacher());var result=new AssignmentSolver().solve(input);assertFalse(result.dataReadyForOpening());var store=new InMemoryPlanStore(input);assertEquals(ApplyOutcome.APPLIED,new AssignmentService(store).apply(input,result,new Cancellation()).outcome());assertEquals(1,store.saved().stream().filter(a->a.teacherId()==null && a.reason()!=null).count());
    }
}
