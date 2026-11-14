package vn.edu.tass.backend.service;

import java.security.Principal;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.exception.*;
import vn.edu.tass.backend.payload.dto.*;
import vn.edu.tass.backend.payload.dto.PlanResultDto.*;
import vn.edu.tass.backend.payload.request.*;
import vn.edu.tass.backend.repository.*;
import vn.edu.tass.backend.solver.PlanValidationEvaluator;

@Service
public class PlanAssignmentService {
    private final PlanActorResolver actors;
    private final AssignmentPlanRepository plans;
    private final PlanAssignmentRepository writes;
    private final PlanResultRepository results;
    private final WorkloadSourceRepository sources;
    private final PlanValidationEvaluator evaluator;
    public PlanAssignmentService(PlanActorResolver actors,AssignmentPlanRepository plans,PlanAssignmentRepository writes,
            PlanResultRepository results,WorkloadSourceRepository sources,PlanValidationEvaluator evaluator) {
        this.actors=actors; this.plans=plans; this.writes=writes; this.results=results; this.sources=sources; this.evaluator=evaluator;
    }
    @Transactional
    public AssignmentMutationDto update(long version,long assignment,UpdateAssignmentRequest request,Principal principal) {
        long actor=actors.requireActor(principal);
        var v=locked(version,request.expectedRevision(),actor,true);
        var rows=rows(v); var row=one(rows,assignment);
        if(row.locked()) throw conflict("ASSIGNMENT_LOCKED","Mở khóa trong thao tác riêng trước khi sửa phân công.");
        String code=trim(request.unassignedReasonCode()),text=trim(request.unassignedReasonText());
        if(request.teacherId()==null && (code==null||text==null)) throw new BadRequestException("Bỏ gán cần unassigned_reason_code và unassigned_reason_text.");
        if(request.teacherId()!=null && (code!=null||text!=null)) throw new BadRequestException("Khi gán giáo viên, bỏ các trường lý do chưa phân công.");
        var next=copy(row,request.teacherId(),false,null,null,null,code,text);
        boolean changed=!Objects.equals(row.teacherId(),next.teacherId())||!Objects.equals(row.unassignedReasonCode(),code)||!Objects.equals(row.unassignedReasonText(),text);
        if(changed) {
            validate(v,rows.stream().map(a->a.id()==assignment?next:a).toList());
            plans.setActor(actor); writes.update(next);
        }
        return finish(v,actor,"MANUAL_ASSIGNMENT_UPDATE",request.changeReason().trim(),changed?List.of(assignment):List.of(),List.of(assignment));
    }
    @Transactional
    public AssignmentMutationDto lock(long version,long assignment,AssignmentLockRequest request,boolean lock,Principal principal) {
        return changeLocks(version,new AssignmentBatchLockRequest(request.expectedRevision(),request.reason(),List.of(assignment),null,null),lock,principal);
    }
    @Transactional
    public AssignmentMutationDto changeLocks(long version,AssignmentBatchLockRequest request,boolean lock,Principal principal) {
        long actor=actors.requireActor(principal);
        var v=locked(version,request.expectedRevision(),actor,lock);
        var rows=rows(v); var selected=select(rows,request); var selectedIds=selected.stream().map(AssignmentRow::id).toList();
        if(lock && selected.stream().anyMatch(a->a.teacherId()==null)) throw conflict("ASSIGNMENT_NOT_ASSIGNED","Không thể khóa dòng chưa gán; toàn bộ thao tác được giữ nguyên.");
        var changed=selected.stream().filter(a->a.locked()!=lock).map(AssignmentRow::id).toList();
        if(!changed.isEmpty()) {
            if(lock) {
                var now=OffsetDateTime.now();
                validate(v,rows.stream().map(a->changed.contains(a.id())?copy(a,a.teacherId(),true,actor,now,request.reason().trim(),null,null):a).toList());
            }
            // Unlock is a metadata-only escape from stale-source/lock conflicts; it never changes a decision.
            plans.setActor(actor);
            for(long id:changed) { if(lock) writes.lock(id,actor,request.reason().trim()); else writes.unlock(id); }
        }
        return finish(v,actor,lock?"MANUAL_ASSIGNMENT_LOCK":"MANUAL_ASSIGNMENT_UNLOCK",request.reason().trim(),changed,selectedIds);
    }
    private PlanVersionDto locked(long id,long expected,long actor,boolean freshRequired) {
        if(id<=0||expected<0) throw new BadRequestException("ID phải dương, expected_revision không âm.");
        var v=version(id); authorize(actor,v);
        plans.lockPlan(v.planId()); plans.lockVersion(id); plans.lockRound(v.roundId());
        v=version(id); authorize(actor,v);
        if(!v.isCurrent()||!"DRAFT".equals(v.status())) throw conflict("CURRENT_DRAFT_REQUIRED","Chỉ được thay đổi current DRAFT.");
        if(v.revisionNo()!=expected) throw conflict("REVISION_CONFLICT","Revision đã đổi; đọc lại version trước khi thử lại.");
        if(freshRequired&&!v.snapshotFresh()) throw conflict("STALE_INPUT","Refresh snapshot trước khi sửa hoặc khóa phân công.");
        writes.lockRows(id);
        return v;
    }
    private void validate(PlanVersionDto v,List<AssignmentRow> preview) {
        var evaluated=evaluator.evaluate(source(v),v,preview);
        for(var finding:evaluated.findings()) {
            // Partial DRAFT is allowed; annual missing data is a warning, never fabricated PASS.
            if("VIOLATION".equals(finding.resultStatus())&&!"REQUIRED_COVERAGE".equals(finding.brCode())) {
                String code="LOCK_CONFLICT".equals(finding.brCode())?"LOCK_CONFLICT":
                    "ASSIGNMENT_ELIGIBILITY".equals(finding.brCode())?"ASSIGNMENT_INELIGIBLE":"ASSIGNMENT_HARD_VIOLATION";
                throw new PlanOperationException(code.equals("LOCK_CONFLICT")?HttpStatus.CONFLICT:HttpStatus.UNPROCESSABLE_ENTITY,
                    code,finding.message()+" ["+finding.subjectType()+"#"+finding.subjectRef()+"]");
            }
        }
    }
    private AssignmentMutationDto finish(PlanVersionDto before,long actor,String action,String reason,List<Long> changed,List<Long> selected) {
        var after=version(before.versionId());
        if(!changed.isEmpty()) writes.audit(after.versionId(),actor,action,reason,before.revisionNo(),after.revisionNo(),changed);
        return new AssignmentMutationDto(new VersionContext(after.versionId(),after.revisionNo(),after.inputSnapshotId(),after.sourceRevisionToken(),after.snapshotFresh(),after.isCurrent()),
            selected.size(),changed.size(),rows(after).stream().filter(a->selected.contains(a.id())).toList());
    }
    private List<AssignmentRow> select(List<AssignmentRow> rows,AssignmentBatchLockRequest request) {
        boolean ids=request.assignmentIds()!=null,group=request.classId()!=null&&request.subjectId()!=null;
        if(ids==group || ids&&(request.classId()!=null||request.subjectId()!=null) || !ids&&!group) throw new BadRequestException("Chọn assignment_ids HOẶC đủ class_id và subject_id.");
        if(ids) {
            var values=request.assignmentIds();
            if(values.isEmpty()||values.size()>2000||values.stream().anyMatch(n->n==null||n<=0)||new HashSet<>(values).size()!=values.size()) throw new BadRequestException("assignment_ids phải gồm 1..2000 ID dương, không trùng.");
            var selected=rows.stream().filter(a->values.contains(a.id())).toList();
            if(selected.size()!=values.size()) throw new NotFoundException("Có phân công không thuộc version này.");
            return selected;
        }
        var selected=rows.stream().filter(a->a.classId()==request.classId()&&a.subjectId()==request.subjectId()).toList();
        if(selected.isEmpty()) throw new NotFoundException("Không tìm thấy nhóm lớp–môn trong snapshot của version.");
        return selected;
    }
    private static AssignmentRow one(List<AssignmentRow> rows,long id) {
        if(id<=0) throw new BadRequestException("assignment_id phải dương.");
        return rows.stream().filter(a->a.id()==id).findFirst().orElseThrow(()->new NotFoundException("Phân công không thuộc version này."));
    }
    private static AssignmentRow copy(AssignmentRow a,Long teacher,boolean locked,Long by,OffsetDateTime at,String reason,String code,String text) {
        return new AssignmentRow(a.id(),a.demandId(),a.classId(),a.className(),a.subjectId(),a.subjectName(),a.demandType(),a.periodsPerWeek(),a.validFrom(),a.validTo(),teacher,
            Objects.equals(teacher,a.teacherId())?a.teacherName():null,locked,by,at,reason,code,text);
    }
    private PlanVersionDto version(long id) { return plans.version(id).orElseThrow(()->new NotFoundException("Không tìm thấy version.")); }
    private void authorize(long actor,PlanVersionDto v) {
        if(!plans.canManage(actor,v.roundId())) throw new PlanOperationException(HttpStatus.FORBIDDEN,"PLAN_ACCESS_DENIED","Không có quyền quản lý toàn bộ phạm vi đợt.");
    }
    private WorkloadSourceRepository.Captured source(PlanVersionDto v) { return sources.read(v.inputSnapshotId()).orElseThrow(()->new NotFoundException("Không tìm thấy snapshot.")); }
    private List<AssignmentRow> rows(PlanVersionDto v) { return results.assignments(v.versionId(),PlanValidationEvaluator.parse(source(v).payload())); }
    private static String trim(String value) { return value==null||value.isBlank()?null:value.trim(); }
    private static PlanOperationException conflict(String code,String message) { return new PlanOperationException(HttpStatus.CONFLICT,code,message); }
}
