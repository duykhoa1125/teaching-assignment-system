package vn.edu.tass.backend.service.impl;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.exception.PlanOperationException;
import vn.edu.tass.backend.payload.dto.RoundReadinessDto;
import vn.edu.tass.backend.payload.dto.RoundReadinessDto.Issue;
import vn.edu.tass.backend.repository.AssignmentPlanRepository;
import vn.edu.tass.backend.repository.RoundReadinessRepository;
import vn.edu.tass.backend.service.PlanActorResolver;
import vn.edu.tass.backend.service.RoundReadinessService;

@Service
public class RoundReadinessServiceImpl implements RoundReadinessService {
    private final PlanActorResolver actors;
    private final AssignmentPlanRepository plans;
    private final RoundReadinessRepository source;

    public RoundReadinessServiceImpl(PlanActorResolver actors, AssignmentPlanRepository plans, RoundReadinessRepository source) {
        this.actors=actors;
        this.plans=plans;
        this.source=source;
    }

    @Override
    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    public RoundReadinessDto check(long roundId, Long configId, Long rulesId, Principal principal) {
        long actor = actors.requireActor(principal);
        if (roundId<=0 || (configId!=null && configId<=0) || (rulesId!=null && rulesId<=0)
                || (configId==null)!=(rulesId==null)) {
            throw new BadRequestException("ID phải dương; gửi cả optimization_config_id và rule_set_version_id hoặc bỏ cả hai.");
        }
        if (!plans.roundExists(roundId)) throw new NotFoundException("Không tìm thấy đợt phân công.");
        if (!plans.canManage(actor,roundId)) {
            throw new PlanOperationException(HttpStatus.FORBIDDEN,"PLAN_ACCESS_DENIED","Không có quyền quản lý toàn bộ phạm vi đợt.");
        }
        var current = plans.current(roundId).orElse(null);
        if (configId==null && current!=null) {
            configId=current.optimizationConfigId();
            rulesId=current.ruleSetVersionId();
        }
        var context=source.context(roundId);
        var coverage=source.coverage(roundId);
        List<Issue> issues=new ArrayList<>();
        for (var finding:source.findings(roundId,configId,rulesId)) {
            var guidance=guidance(finding.code());
            issues.add(new Issue(finding.code(),finding.severity(),finding.category(),finding.entityType(),
                finding.entityId(),finding.relatedId(),guidance.message(),guidance.suggestion()));
        }
        if (coverage.requiredComponents()>coverage.assigned()) {
            add(issues,"REQUIRED_COMPONENTS_UNASSIGNED","WARNING","COVERAGE",roundId);
        }
        boolean sameConfig=current!=null && configId!=null && rulesId!=null
            && configId==current.optimizationConfigId() && rulesId==current.ruleSetVersionId();
        if (current==null) {
            add(issues,"PLAN_REQUIRED_FOR_RELEASE","INFO","LIFECYCLE",roundId);
        } else {
            if (!"DRAFT".equals(current.status())) add(issues,"CURRENT_DRAFT_REQUIRED","ERROR","LIFECYCLE",roundId);
            if (!current.snapshotFresh()) add(issues,"SNAPSHOT_STALE","WARNING","LIFECYCLE",roundId);
            if (!sameConfig) add(issues,"CONFIGURATION_DIFFERS_FROM_PLAN","WARNING","LIFECYCLE",roundId);
            if (!context.validationAllowsRelease()) add(issues,"FRESH_VALIDATION_REQUIRED","INFO","LIFECYCLE",roundId);
            if (context.pendingFeedback()) add(issues,"PENDING_FEEDBACK","INFO","LIFECYCLE",roundId);
        }
        boolean canRun=issues.stream().noneMatch(i->"ERROR".equals(i.severity()));
        // Solver limitations do not prohibit a manually validated multi-phase plan from release.
        boolean releaseDataReady=issues.stream().noneMatch(i->"ERROR".equals(i.severity())
            && !List.of("UNSUPPORTED_SCOPE","LIFECYCLE").contains(i.category()));
        boolean releaseReady=current!=null && current.snapshotFresh() && sameConfig
            && coverage.requiredComponents()>0 && coverage.requiredComponents()==coverage.assigned()
            && context.validationAllowsRelease() && !context.pendingFeedback() && releaseDataReady;
        issues.sort(Comparator.comparing(Issue::code).thenComparing(Issue::entityType)
            .thenComparing(Issue::entityId,Comparator.nullsFirst(Long::compareTo))
            .thenComparing(Issue::relatedId,Comparator.nullsFirst(Long::compareTo)));
        return new RoundReadinessDto(roundId,context.sourceToken(),configId,rulesId,context.startsOn(),context.endsOn(),
            current==null?null:current.versionId(),current==null?null:current.revisionNo(),canRun,
            releaseReady && "DRAFT".equals(current.status()),releaseReady && "READY_TO_EXPORT".equals(current.status()),
            true,false,coverage,issues);
    }

    private static void add(List<Issue> issues,String code,String severity,String category,long roundId) {
        var text=guidance(code);
        issues.add(new Issue(code,severity,category,"ASSIGNMENT_ROUND",roundId,null,text.message(),text.suggestion()));
    }

    private record Guidance(String message,String suggestion) {}
    private static Guidance guidance(String code) {
        return switch(code) {
            case "ROUND_SCOPE_UNCONFIRMED" -> new Guidance("Phạm vi đợt chưa được xác nhận.","Xác nhận phạm vi môn/khối của đợt.");
            case "SCOPE_UNCONFIRMED" -> new Guidance("Phạm vi môn/khối chưa được xác nhận.","Kiểm tra và xác nhận bản ghi phạm vi.");
            case "MISSING_APPLICABILITY" -> new Guidance("Chưa xác định môn có áp dụng cho lớp.","Bổ sung APPLICABLE hoặc NOT_APPLICABLE và xác nhận.");
            case "UNDETERMINED" -> new Guidance("Trạng thái áp dụng lớp–môn chưa xác định.","Chốt APPLICABLE hoặc NOT_APPLICABLE.");
            case "APPLICABILITY_UNCONFIRMED" -> new Guidance("Áp dụng lớp–môn chưa xác nhận.","Xác nhận quyết định áp dụng.");
            case "REQUIRED_SET_UNCONFIRMED" -> new Guidance("Tập thành phần nhu cầu chưa được xác nhận.","Xác nhận lại tập thành phần sau lần thay đổi cuối.");
            case "EMPTY_REQUIRED_SET" -> new Guidance("Lớp–môn áp dụng chưa có thành phần bắt buộc.","Khai báo đầy đủ các loại nhu cầu bắt buộc.");
            case "MISSING_OR_INVALID_REQUIRED_DEMAND" -> new Guidance("Thành phần bắt buộc thiếu nhu cầu ACTIVE hợp lệ hoặc xác nhận.","Nối đúng nhu cầu, loại thành phần và khoảng hiệu lực rồi xác nhận.");
            case "ACTIVE_DEMAND_NOT_IN_REQUIRED_SET" -> new Guidance("Có nhu cầu ACTIVE chưa thuộc tập thành phần bắt buộc.","Đối chiếu và xác nhận tập thành phần, không bỏ qua nhu cầu.");
            case "DEMAND_ON_NOT_APPLICABLE" -> new Guidance("Có nhu cầu ACTIVE trên lớp–môn không áp dụng.","Sửa trạng thái áp dụng hoặc nhu cầu theo dữ liệu thực tế.");
            case "SCHOOL_INACTIVE" -> new Guidance("Trường không hoạt động.","Kiểm tra trường và học kỳ của đợt.");
            case "SCHOOL_CONTEXT_MISSING" -> new Guidance("Thiếu bối cảnh trường/học kỳ đã xác nhận.","Bổ sung school_context có nguồn căn cứ.");
            case "EMPTY_SUBJECT_SCOPE" -> new Guidance("Đợt chưa có phạm vi môn/khối.","Khai báo phạm vi trước khi chạy solver.");
            case "NO_ACTIVE_DEMANDS" -> new Guidance("Không có nhu cầu ACTIVE trong phạm vi áp dụng.","Kiểm tra phạm vi và dữ liệu nhu cầu.");
            case "UNSUPPORTED_EFFECTIVE_INTERVALS" -> new Guidance("Nhu cầu có nhiều khoảng hiệu lực; solver hiện giải một khoảng đồng nhất.","Tách giai đoạn bằng nghiệp vụ được duyệt; không cộng các mức tiết của nhiều giai đoạn.");
            case "INVALID_DEMAND_LOAD" -> new Guidance("Số tiết hoặc đơn vị nhu cầu không hợp lệ.","Dùng PERIOD_PER_WEEK, số tiết dương tối đa 999.99 và hai chữ số thập phân.");
            case "INACTIVE_CLASS" -> new Guidance("Nhu cầu thuộc lớp không hoạt động.","Kiểm tra lớp và nhu cầu trong phạm vi.");
            case "SUBJECT_EFFECTIVITY_GAP" -> new Guidance("Hiệu lực môn không phủ nhu cầu.","Bổ sung hiệu lực môn hoặc điều chỉnh nhu cầu theo căn cứ.");
            case "EMPLOYMENT_MISSING" -> new Guidance("Thiếu tình trạng công tác của giáo viên trong khoảng giải.","Ghi rõ TEACHING, ON_LEAVE hoặc INACTIVE; không suy thiếu hồ sơ thành nghỉ dạy.");
            case "UNSUPPORTED_EMPLOYMENT_INTERVAL" -> new Guidance("Công tác/nghỉ thay đổi giữa khoảng giải hoặc có nhiều bản ghi công tác.","Xử lý phân đoạn; không xét công tác chỉ tại một ngày.");
            case "CALCULATION_PERIOD_MISSING" -> new Guidance("Thiếu kỳ tính tải phủ khoảng giải.","Bổ sung calculation_period và dữ liệu tải có nguồn.");
            case "UNSUPPORTED_CALCULATION_PERIODS" -> new Guidance("Nguồn tải có nhiều kỳ tính trong khoảng giải.","Cần chuẩn hóa hoặc phân đoạn được hỗ trợ trước khi giải.");
            case "CALCULATION_PERIOD_INCOMPLETE" -> new Guidance("Kỳ tính tải không phủ toàn khoảng giải.","Bổ sung kỳ tính tải đúng khoảng hiệu lực.");
            case "WORKLOAD_BASIS_MISSING_OR_AMBIGUOUS" -> new Guidance("Thiếu hoặc không chọn được một định mức đã xác nhận phủ toàn khoảng.","Bổ sung hồ sơ định mức đúng vị trí, đơn vị, hiệu lực và nguồn căn cứ.");
            case "WEEKLY_INPUT_MISSING" -> new Guidance("Thiếu tải ngoài phạm vi theo tuần có xác nhận và nguồn độc lập.","Bổ sung OUTSIDE_SCOPE_WEEKLY, kể cả giá trị 0 có bằng chứng; không lấy tổng của phương án làm tải ngoài phạm vi.");
            case "WORKLOAD_INVENTORY_UNCONFIRMED" -> new Guidance("Chưa xác nhận đầy đủ danh sách nguồn tải cho đợt và kỳ tính.","Xác nhận phạm vi nhu cầu và danh sách khoản giảm/quy đổi, kể cả danh sách rỗng; không tự suy thiếu dòng thành 0.");
            case "REDUCTION_INPUT_INCOMPLETE" -> new Guidance("Dữ liệu nhiệm vụ/giảm tiết chưa đầy đủ hoặc chưa xác nhận.","Bổ sung giá trị, người xác nhận và bằng chứng; không tự thay bằng 0.");
            case "UNSUPPORTED_REDUCTION_INTERVAL" -> new Guidance("Nhiệm vụ/giảm tiết thay đổi trong khoảng giải.","Chuẩn hóa hoặc phân đoạn trước khi giải.");
            case "CONVERSION_INPUT_INCOMPLETE" -> new Guidance("Hoạt động quy đổi thiếu số tiết, hệ số phê duyệt hoặc chứng cứ.","Bổ sung dữ liệu đã xác nhận; không tự quy đổi hoặc thay bằng 0.");
            case "UNSUPPORTED_CONVERSION_UNIT" -> new Guidance("Hoạt động quy đổi chưa dùng đơn vị tuần được hỗ trợ.","Chuẩn hóa từ căn cứ được duyệt trong bộ tính tải trước khi giải.");
            case "RULE_SOURCE_MISMATCH" -> new Guidance("Nguồn tính tải không khớp bộ quy tắc hoặc hiệu lực đã chọn.","Đối chiếu quy tắc của nhiệm vụ/giảm tiết/hoạt động và cấu hình chạy.");
            case "NO_ELIGIBLE_TEACHER" -> new Guidance("Nhu cầu chưa có giáo viên đủ điều kiện phủ toàn khoảng.","Kiểm tra nguồn lực và chuyên môn; solver vẫn có thể trả DRAFT một phần.");
            case "EXPERIENCE_UNKNOWN" -> new Guidance("Cặp giáo viên–môn–khối thiếu kinh nghiệm xác nhận tại mốc tính.","Bổ sung hồ sơ; UNKNOWN khác 0 năm và không lấy DRAFT làm kinh nghiệm.");
            case "EXPERIENCE_UNKNOWN_PENALIZED" -> new Guidance("Kinh nghiệm chưa biết; cấu hình đã chọn chính sách phạt rõ ràng.","Bổ sung hồ sơ nếu có; scoring phải dùng đúng mức phạt UNKNOWN đã cấu hình.");
            case "CONFIGURATION_SELECTION_REQUIRED" -> new Guidance("Chưa chọn cấu hình và bộ quy tắc.","Gửi cả hai ID hoặc tạo plan để dùng lựa chọn trong current snapshot.");
            case "CONFIGURATION_NOT_CONFIRMED" -> new Guidance("Cấu hình/quy tắc thiếu, chưa xác nhận, sai hợp đồng hoặc không phủ khoảng giải.","Chọn bộ cấu hình và quy tắc hợp lệ có xác nhận.");
            case "WEEKLY_LIMIT_NOT_CONFIGURED" -> new Guidance("Thiếu ngưỡng tải tuần có nguồn trong cấu hình.","Bổ sung ngưỡng có căn cứ cho cấu hình đã chọn; không dùng một trần mặc định chung.");
            case "DEMO_CONFIGURATION" -> new Guidance("Cấu hình hiện mang nhãn dữ liệu/quy tắc minh họa.","Giữ nhãn minh họa khi hiển thị kết quả; không coi là thẩm định quy tắc thực tế.");
            case "ANNUAL_WORKLOAD_NOT_VALIDATED" -> new Guidance("Tiền kiểm này chưa xác nhận tải năm.","Giữ cảnh báo cho bộ kiểm tra tải năm; không thay dữ liệu năm chưa biết bằng 0.");
            case "LOCK_CONFLICT" -> new Guidance("Phân công khóa xung đột với nhu cầu hoặc điều kiện hiện tại.","Xử lý khóa qua nghiệp vụ sửa/khóa trước khi làm mới/chạy.");
            case "REQUIRED_COMPONENTS_UNASSIGNED" -> new Guidance("Chưa gán đủ thành phần bắt buộc trong current plan.","Có thể giải DRAFT một phần; cần gán đủ trước khi mở phản hồi/xuất.");
            case "PLAN_REQUIRED_FOR_RELEASE" -> new Guidance("Đợt chưa có current plan.","Tạo DRAFT trước khi gửi yêu cầu chạy; kiểm tra dữ liệu có thể thực hiện trước.");
            case "CURRENT_DRAFT_REQUIRED" -> new Guidance("Current version không phải DRAFT để chạy solver.","Cần tạo current DRAFT qua nghiệp vụ version trước lượt chạy mới.");
            case "SNAPSHOT_STALE" -> new Guidance("Snapshot của current version đã cũ so với dữ liệu nguồn.","Làm mới DRAFT và đọc revision mới trước khi tạo lượt chạy.");
            case "CONFIGURATION_DIFFERS_FROM_PLAN" -> new Guidance("Cấu hình tiền kiểm khác cấu hình trong current snapshot.","Làm mới DRAFT bằng cấu hình đã chọn trước khi chạy hoặc kiểm tra phát hành.");
            case "FRESH_VALIDATION_REQUIRED" -> new Guidance("Chưa có validation còn mới cho revision/snapshot/token hiện tại.","Chạy hậu kiểm và lưu validation trước khi mở phản hồi/xuất.");
            case "PENDING_FEEDBACK" -> new Guidance("Phương án còn phản hồi chờ xử lý.","Xử lý phản hồi theo vòng đời trước khi phát hành/xuất.");
            default -> throw new IllegalArgumentException("Unmapped readiness finding: "+code);
        };
    }
}
