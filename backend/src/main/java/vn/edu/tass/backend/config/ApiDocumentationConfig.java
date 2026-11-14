package vn.edu.tass.backend.config;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.parameters.Parameter;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;

@Configuration
public class ApiDocumentationConfig {
    private static final Map<String, String> RESOURCES = Map.ofEntries(
        Map.entry("schools", "Trường học"),
        Map.entry("academic-years", "Năm học"),
        Map.entry("semesters", "Học kỳ"),
        Map.entry("education-levels", "Cấp học"),
        Map.entry("grades", "Khối lớp"),
        Map.entry("classes", "Lớp học"),
        Map.entry("subjects", "Môn học"),
        Map.entry("teachers", "Giáo viên"),
        Map.entry("teaching-demands", "Nhu cầu giảng dạy"),
        Map.entry("departments", "Tổ chuyên môn"),
        Map.entry("teacher-employments", "Công tác giáo viên"),
        Map.entry("teaching-qualifications", "Chuyên môn giáo viên"),
        Map.entry("teaching-experiences", "Kinh nghiệm giảng dạy"),
        Map.entry("assignment-rounds", "Đợt phân công"),
        Map.entry("round-subject-scopes", "Phạm vi môn của đợt"),
        Map.entry("class-subject-applicabilities", "Áp dụng môn cho lớp"),
        Map.entry("required-demand-components", "Thành phần nhu cầu bắt buộc"),
        Map.entry("teacher-workload-bases", "Cơ sở định mức giáo viên"),
        Map.entry("teaching-histories", "Lịch sử thực dạy"),
        Map.entry("teacher-duties", "Nhiệm vụ giáo viên")
    );

    @Bean
    OpenAPI tassOpenApi() {
        return new OpenAPI().info(new Info()
            .title("TASS Backend API")
            .version("0.1.0")
            .description("20 nhóm CRUD dữ liệu đầu vào và API plan/current DRAFT/refresh snapshot/readiness, sửa/khóa/mở khóa phân công theo dòng hoặc nhóm, đọc tải/metadata và lưu validation. JSON dùng snake_case; ngày YYYY-MM-DD; "
                + "thời điểm ISO 8601 có múi giờ. API plan/solver yêu cầu principal tin cậy; có async run/poll/cancel và apply nghiệm có hậu kiểm/transaction; chưa có login. "
                + "Xem backend/docs/API.md để biết quy tắc, bộ lọc và ví dụ."));
    }

    @Bean
    OpenApiCustomizer inputCrudDocumentation(ObjectMapper mapper) throws IOException {
        Map<String, Map<String, Object>> examples;
        try (var input = new ClassPathResource("api-examples.json").getInputStream()) {
            examples = mapper.readValue(input, new TypeReference<>() {});
        }
        return openApi -> {
            if (openApi.getComponents() == null) {
                openApi.setComponents(new io.swagger.v3.oas.models.Components());
            }
            openApi.getComponents().addSchemas("ApiErrorResponse", new ObjectSchema()
                .addProperty("error", new StringSchema().example("Bad Request"))
                .addProperty("code", new StringSchema().example("INVALID_REQUEST"))
                .addProperty("message", new StringSchema().example("JSON hoặc tham số không hợp lệ")));
            openApi.getPaths().forEach((path, item) -> documentPath(path, item, examples));
            documentPlanOperations(openApi);
            documentReadiness(openApi);
            documentSolverRuns(openApi);
            documentPlanResults(openApi);
            documentAssignmentMutations(openApi);
        };
    }

    private static void documentAssignmentMutations(OpenAPI api) {
        String base="/api/plan-versions/{id}/assignments";
        for(String suffix:List.of("/{assignmentId}","/{assignmentId}/lock","/{assignmentId}/unlock","/locks","/unlocks")) {
            var item=api.getPaths().get(base+suffix); if(item==null) continue;
            item.readOperationsMap().forEach((method,operation)->{
                operation.setTags(List.of("Manual assignments"));
                var responses=operation.getResponses(); if(responses==null) { responses=new ApiResponses(); operation.setResponses(responses); }
                if(responses.get("200")!=null) responses.get("200").description("Atomic operation completed. Inspect changed_count and actual version.revision_no. No-op does not increase revision.");
                responses.addApiResponse("400",error("Malformed body, missing explicit teacher_id, invalid selector, duplicate IDs or missing reasons.","Bad Request","INVALID_REQUEST"));
                responses.addApiResponse("401",error("Trusted principal required; actor is never read from body.","Unauthorized","AUTHENTICATION_REQUIRED"));
                responses.addApiResponse("403",error("Academic manager scope required.","Forbidden","PLAN_ACCESS_DENIED"));
                responses.addApiResponse("404",error("Version/assignment/group not found in this version.","Not Found","RESOURCE_NOT_FOUND"));
                responses.addApiResponse("409",error("CURRENT_DRAFT_REQUIRED, REVISION_CONFLICT, STALE_INPUT, ASSIGNMENT_LOCKED, ASSIGNMENT_NOT_ASSIGNED, LOCK_CONFLICT or CONCURRENT_MODIFICATION. Pure unlock allows stale source.","Conflict","REVISION_CONFLICT"));
                responses.addApiResponse("422",error("Ineligible assignment, hard workload violation or unsupported/missing captured source. Partial coverage and missing annual data alone do not block a valid edit.","Unprocessable Entity","ASSIGNMENT_HARD_VIOLATION"));
                if(operation.getRequestBody()!=null && operation.getRequestBody().getContent()!=null) {
                    var media=operation.getRequestBody().getContent().get("application/json");
                    if(media!=null) {
                        if(suffix.equals("/{assignmentId}")) media.setExample(Map.of("expected_revision",7,"teacher_id",12,"change_reason","Điều chỉnh phân công đã thống nhất"));
                        else if(suffix.equals("/locks")||suffix.equals("/unlocks")) media.setExample(Map.of("expected_revision",7,"class_id",10,"subject_id",2,"reason","Giữ phân công chính khóa và tăng cường đã xác nhận"));
                        else media.setExample(Map.of("expected_revision",7,"reason","Xác nhận phân công thành phần"));
                    }
                }
            });
        }
    }

    private static void documentPlanResults(OpenAPI api) {
        for(String suffix:List.of("assignments","workloads","optimization","validation")) {
            var item=api.getPaths().get("/api/plan-versions/{id}/"+suffix); if(item==null) continue;
            item.readOperationsMap().forEach((method,operation)->{
                operation.setTags(List.of("Saved plan results"));
                var responses=operation.getResponses(); if(responses==null) { responses=new ApiResponses(); operation.setResponses(responses); }
                if(method==PathItem.HttpMethod.POST) {
                    var ok=responses.remove("200"); responses.addApiResponse("201",ok==null?new ApiResponse().description("Immutable validation report created; inspect overall_status."):ok.description("Validation report created; Location identifies this report. May contain violations or missing data."));
                    responses.addApiResponse("409",error("CURRENT_VERSION_REQUIRED, REVISION_CONFLICT, STALE_INPUT or CONCURRENT_MODIFICATION.","Conflict","REVISION_CONFLICT"));
                }
                responses.addApiResponse("400",error("Invalid ID/filter/pagination/body. limit 1..200, offset >=0.","Bad Request","INVALID_REQUEST"));
                responses.addApiResponse("401",error("Trusted principal required.","Unauthorized","AUTHENTICATION_REQUIRED"));
                responses.addApiResponse("403",error("Manager scope required; these are not Teacher portal endpoints.","Forbidden","PLAN_ACCESS_DENIED"));
                responses.addApiResponse("404",error("Version/report not found.","Not Found","RESOURCE_NOT_FOUND"));
                if(suffix.equals("workloads")||method==PathItem.HttpMethod.POST) responses.addApiResponse("422",error("Captured source cannot be normalized/validated; unsupported segmentation or missing confirmed workload source.","Unprocessable Entity","UNSUPPORTED_DEMAND_INTERVAL"));
            });
        }
    }

    private static void documentSolverRuns(OpenAPI api) {
        for (String path:List.of("/api/plan-versions/{id}/solver-runs","/api/solver-runs/{id}","/api/solver-runs/{id}/cancel")) {
            var item=api.getPaths().get(path); if(item==null) continue;
            item.readOperationsMap().forEach((method,operation)->{
                operation.setTags(List.of("Solver runs"));
                var responses=operation.getResponses();
                if(responses==null) { responses=new ApiResponses(); operation.setResponses(responses); }
                if(path.endsWith("/solver-runs")) {
                    var success=responses.remove("200");
                    responses.addApiResponse("202",success==null?new ApiResponse().description("Queued; Location points to run."):success.description("Accepted; poll Location for status."));
                    responses.addApiResponse("409",error("SOLVER_RUN_ACTIVE includes Location of active run. Also CURRENT_DRAFT_REQUIRED, REVISION_CONFLICT, STALE_INPUT, SNAPSHOT_REFRESH_REQUIRED or LOCK_CONFLICT.","Conflict","SOLVER_RUN_ACTIVE")
                        .addHeaderObject("Location",new io.swagger.v3.oas.models.headers.Header().description("Present for SOLVER_RUN_ACTIVE: URL to poll existing run.").schema(new StringSchema())));
                    responses.addApiResponse("422",error("Readiness or normalized solver input failed.","Unprocessable Entity","SOLVER_NOT_READY"));
                    responses.addApiResponse("503",error("Bounded queue full or coordinator unavailable. Retry after polling existing runs.","Service Unavailable","SOLVER_QUEUE_FULL"));
                }
                responses.addApiResponse("400",error("Invalid request.","Bad Request","INVALID_REQUEST"));
                responses.addApiResponse("401",error("Trusted authenticated principal required.","Unauthorized","AUTHENTICATION_REQUIRED"));
                responses.addApiResponse("403",error("Manager scope required.","Forbidden","PLAN_ACCESS_DENIED"));
                responses.addApiResponse("404",error("Version/run missing.","Not Found","RESOURCE_NOT_FOUND"));
            });
        }
    }

    private static void documentReadiness(OpenAPI openApi) {
        PathItem item=openApi.getPaths().get("/api/assignment-rounds/{id}/readiness");
        if (item==null || item.getGet()==null) return;
        Operation operation=item.getGet();
        operation.setTags(List.of("Chuẩn bị phân công"));
        operation.setSummary("Kiểm tra dữ liệu và phạm vi có thể chạy solver");
        operation.setDescription("Đọc nhất quán theo source token, không tạo snapshot hoặc sửa dữ liệu. "
            + "Gửi cả optimization_config_id và rule_set_version_id hoặc bỏ cả hai để dùng current snapshot. "
            + "Thiếu ứng viên là cảnh báo; thiếu tải tuần hoặc khoảng hiệu lực chưa hỗ trợ chặn solver. "
            + "can_run_solver là tiền kiểm nguồn (preflight_only=true), chưa thay InputValidator/hậu kiểm; "
            + "can_open_feedback và can_export xét coverage, validation còn mới và vòng đời riêng. "
            + "Yêu cầu principal tin cậy, tài khoản ACTIVE, vai trò/phạm vi quản lý như plan API.");
        documentParameters(operation);
        ApiResponses responses=operation.getResponses();
        if (responses==null) { responses=new ApiResponses(); operation.setResponses(responses); }
        responses.addApiResponse("400",error("ID sai hoặc chỉ gửi một ID cấu hình/quy tắc.","Bad Request","INVALID_REQUEST"));
        responses.addApiResponse("401",error("Chưa có principal xác thực.","Unauthorized","AUTHENTICATION_REQUIRED"));
        responses.addApiResponse("403",error("Không có quyền quản lý phạm vi đợt.","Forbidden","PLAN_ACCESS_DENIED"));
        responses.addApiResponse("404",error("Không tìm thấy đợt.","Not Found","RESOURCE_NOT_FOUND"));
    }

    private static void documentPlanOperations(OpenAPI openApi) {
        for (String path : List.of("/api/assignment-rounds/{id}/plan", "/api/plan-versions/{id}",
                "/api/plan-versions/{id}/refresh-snapshot")) {
            PathItem item = openApi.getPaths().get(path);
            if (item == null) continue;
            item.readOperationsMap().forEach((method, operation) -> {
                operation.setTags(List.of("Phương án phân công"));
                boolean create = method == PathItem.HttpMethod.POST && path.endsWith("/plan");
                boolean refresh = path.endsWith("/refresh-snapshot");
                operation.setSummary(create ? "Tạo plan và current DRAFT đầu tiên"
                    : refresh ? "Làm mới snapshot của current DRAFT" : "Đọc phương án và metadata snapshot");
                operation.setDescription("Yêu cầu principal do server xác thực, tài khoản ACTIVE, vai trò ACADEMIC_MANAGER "
                    + "và phạm vi quản lý phủ toàn đợt. Chưa triển khai login trong backend. "
                    + "Snapshot do server chụp từ DB, chưa phải đầu vào solver. "
                    + (refresh ? "expected_revision phải khớp; giữ khóa hợp lệ, xung đột khóa rollback toàn bộ. " : "")
                    + "revision_no trả về là giá trị thực do trigger quản lý.");
                documentParameters(operation);
                ApiResponses responses = operation.getResponses();
                if (responses == null) { responses = new ApiResponses(); operation.setResponses(responses); }
                if (create) {
                    ApiResponse success = responses.remove("200");
                    responses.addApiResponse("201", success == null ? new ApiResponse().description("Đã tạo DRAFT; Location trỏ đến version.")
                        : success.description("Đã tạo DRAFT; Location trỏ đến version."));
                }
                responses.addApiResponse("400", error("Request không hợp lệ hoặc chứa trường actor/snapshot không được nhận.", "Bad Request", "INVALID_REQUEST"));
                responses.addApiResponse("401", error("Chưa có principal xác thực.", "Unauthorized", "AUTHENTICATION_REQUIRED"));
                responses.addApiResponse("403", error("Tài khoản/vai trò/phạm vi không hợp lệ.", "Forbidden", "PLAN_ACCESS_DENIED"));
                responses.addApiResponse("404", error("Không tìm thấy đợt/plan/version.", "Not Found", "RESOURCE_NOT_FOUND"));
                if (method == PathItem.HttpMethod.POST) {
                    responses.addApiResponse("409", error("PLAN_ALREADY_EXISTS, CURRENT_DRAFT_REQUIRED, REVISION_CONFLICT, LOCK_CONFLICT hoặc CONCURRENT_MODIFICATION.", "Conflict", create ? "PLAN_ALREADY_EXISTS" : "REVISION_CONFLICT"));
                    responses.addApiResponse("422", error("Cấu hình/quy tắc chưa được xác nhận hoặc không phủ học kỳ.", "Unprocessable Entity", "CONFIGURATION_NOT_CONFIRMED"));
                }
            });
        }
    }

    private static void documentPath(String path, PathItem item, Map<String, Map<String, Object>> examples) {
        if (!path.startsWith("/api/")) return;
        String resource = path.substring("/api/".length()).split("/")[0];
        String label = RESOURCES.get(resource);
        if (label == null) return;
        if (!path.equals("/api/" + resource) && !path.equals("/api/" + resource + "/{id}")) return;
        boolean byId = path.endsWith("/{id}");
        item.readOperationsMap().forEach((method, operation) -> {
            operation.setTags(List.of(label));
            operation.setSummary(summary(method, byId, label));
            operation.setDescription(description(method, byId));
            documentParameters(operation);
            if (method == PathItem.HttpMethod.GET && !byId) documentStatusFilter(resource, operation);
            if (method == PathItem.HttpMethod.POST || method == PathItem.HttpMethod.PUT) {
                addRequestExample(operation, examples.get(resource));
            }
            documentResponses(operation, method, byId);
        });
    }

    private static void documentStatusFilter(String resource, Operation operation) {
        String field;
        List<String> values;
        switch (resource) {
            case "teaching-demands" -> {
                field = "status";
                values = List.of("ACTIVE", "INACTIVE");
            }
            case "teacher-employments" -> {
                field = "employment_status";
                values = List.of("TEACHING", "ON_LEAVE", "INACTIVE");
            }
            case "teaching-qualifications" -> {
                field = "verification_status";
                values = List.of("PENDING", "VERIFIED", "INACTIVE");
            }
            default -> { return; }
        }
        if (operation.getParameters() == null) return;
        operation.getParameters().stream().filter(p -> field.equals(p.getName())).forEach(p -> {
            p.setSchema(new StringSchema()._enum(values));
            p.setDescription("Lọc chính xác theo trạng thái được hỗ trợ.");
        });
    }

    private static String summary(PathItem.HttpMethod method, boolean byId, String label) {
        return switch (method) {
            case GET -> byId ? "Xem " + label.toLowerCase() + " theo ID" : "Liệt kê " + label.toLowerCase();
            case POST -> "Tạo " + label.toLowerCase();
            case PUT -> "Cập nhật " + label.toLowerCase();
            case DELETE -> "Xóa " + label.toLowerCase();
            default -> method.name() + " " + label;
        };
    }

    private static String description(PathItem.HttpMethod method, boolean byId) {
        if (method == PathItem.HttpMethod.GET && !byId) {
            return "Danh sách sắp theo id tăng dần; có thể kết hợp bộ lọc với limit/offset. "
                + "as_of (nếu có) tính cả ngày bắt đầu và kết thúc.";
        }
        if (method == PathItem.HttpMethod.PUT) {
            return "Thay các trường trong request; gửi lại toàn bộ trường bắt buộc. "
                + "Trường tùy chọn bị bỏ qua sẽ thành null.";
        }
        if (method == PathItem.HttpMethod.POST) {
            return "Tạo bản ghi mới. Location trỏ đến URL của bản ghi vừa tạo.";
        }
        if (method == PathItem.HttpMethod.DELETE) {
            return "Xóa bản ghi. Bản ghi đang được tham chiếu sẽ trả 409.";
        }
        return "Trả một bản ghi hoặc 404 nếu không tồn tại.";
    }

    private static void documentParameters(Operation operation) {
        if (operation.getParameters() == null) return;
        for (Parameter parameter : operation.getParameters()) {
            if (parameter.getSchema() == null) continue;
            switch (parameter.getName()) {
                case "limit" -> {
                    parameter.setDescription("Số bản ghi mỗi lần, từ 1 đến 100; mặc định 20.");
                    parameter.getSchema().setMinimum(java.math.BigDecimal.ONE);
                    parameter.getSchema().setMaximum(java.math.BigDecimal.valueOf(100));
                }
                case "offset" -> {
                    parameter.setDescription("Số bản ghi bỏ qua, không âm; mặc định 0.");
                    parameter.getSchema().setMinimum(java.math.BigDecimal.ZERO);
                }
                case "id" -> {
                    parameter.setDescription("ID bản ghi, số nguyên dương.");
                    parameter.getSchema().setMinimum(java.math.BigDecimal.ONE);
                }
                case "as_of" -> parameter.setDescription("Ngày cần xét hiệu lực, dạng YYYY-MM-DD; tính cả hai đầu khoảng.");
                case "q" -> parameter.setDescription("Tìm theo tên, không phân biệt chữ hoa/thường.");
                default -> {
                    if (parameter.getName().endsWith("_id")) {
                        parameter.setDescription("Lọc chính xác theo ID liên quan.");
                        parameter.getSchema().setMinimum(java.math.BigDecimal.ONE);
                    } else {
                        parameter.setDescription("Lọc chính xác theo giá trị.");
                    }
                }
            }
        }
    }

    private static void addRequestExample(Operation operation, Map<String, Object> example) {
        if (example == null || operation.getRequestBody() == null
                || operation.getRequestBody().getContent() == null) return;
        MediaType json = operation.getRequestBody().getContent().get("application/json");
        if (json != null) json.setExample(example);
    }

    private static void documentResponses(Operation operation, PathItem.HttpMethod method, boolean byId) {
        ApiResponses responses = operation.getResponses();
        if (responses == null) {
            responses = new ApiResponses();
            operation.setResponses(responses);
        }
        if (method == PathItem.HttpMethod.POST) {
            ApiResponse success = responses.remove("200");
            if (success == null) success = new ApiResponse();
            success.setDescription("Đã tạo; header Location chứa URL bản ghi.");
            responses.addApiResponse("201", success);
        } else if (method == PathItem.HttpMethod.DELETE) {
            responses.remove("200");
            responses.addApiResponse("204", new ApiResponse().description("Đã xóa, không có body."));
        } else if (responses.get("200") != null) {
            responses.get("200").setDescription(method == PathItem.HttpMethod.GET
                ? (byId ? "Bản ghi theo ID." : "Danh sách bản ghi.")
                : "Bản ghi sau cập nhật.");
        }
        responses.addApiResponse("400", error("Request hoặc tham số không hợp lệ.", "Bad Request", "INVALID_REQUEST"));
        if (byId) {
            responses.addApiResponse("404", error("Không tìm thấy bản ghi.", "Not Found", "RESOURCE_NOT_FOUND"));
        }
        if (method == PathItem.HttpMethod.POST || method == PathItem.HttpMethod.PUT
                || method == PathItem.HttpMethod.DELETE) {
            responses.addApiResponse("409", error("Trùng dữ liệu, vi phạm khóa ngoại hoặc chồng khoảng hiệu lực.", "Conflict", "DUPLICATE_RESOURCE"));
            responses.addApiResponse("422", error("Vi phạm ràng buộc dữ liệu PostgreSQL.", "Unprocessable Entity", "DATA_CONSTRAINT"));
        }
    }

    private static ApiResponse error(String description, String status, String code) {
        Map<String, String> example = new LinkedHashMap<>();
        example.put("error", status);
        example.put("code", code);
        example.put("message", description);
        return new ApiResponse().description(description).content(new Content().addMediaType(
            "application/json", new MediaType()
                .schema(new Schema<>().$ref("#/components/schemas/ApiErrorResponse"))
                .example(example)));
    }
}
