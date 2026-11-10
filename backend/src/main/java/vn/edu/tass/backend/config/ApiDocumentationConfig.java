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
            .description("20 nhóm CRUD dữ liệu đầu vào, hồ sơ giáo viên và kiểm tra chuẩn bị đợt. JSON dùng snake_case; ngày YYYY-MM-DD; "
                + "thời điểm ISO 8601 có múi giờ. Chưa triển khai đăng nhập, phân quyền và các API phương án/solver. "
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
        };
    }

    private static void documentPath(String path, PathItem item, Map<String, Map<String, Object>> examples) {
        if (!path.startsWith("/api/")) return;
        if (path.equals("/api/teachers/{id}/profile")) {
            Operation operation = item.getGet();
            operation.setTags(List.of("Hồ sơ giáo viên"));
            operation.setSummary("Xem hồ sơ tổng hợp giáo viên theo học kỳ");
            operation.setDescription("Trả công tác, chuyên môn có hiệu lực giao với học kỳ, kinh nghiệm mới nhất theo môn/khối "
                + "tại ngày kết thúc học kỳ, lịch sử thực dạy đã kết thúc trước ngày đó, cơ sở định mức và nhiệm vụ thuộc học kỳ. "
                + "Chỉ chấp nhận học kỳ thuộc cùng trường với giáo viên; danh sách rỗng nếu chưa có dữ liệu.");
            documentParameters(operation);
            operation.getParameters().stream().filter(p -> "semester_id".equals(p.getName()))
                .forEach(p -> p.setDescription("ID học kỳ cần xem; bắt buộc và phải thuộc trường của giáo viên."));
            documentResponses(operation, PathItem.HttpMethod.GET, true);
            operation.getResponses().get("200").setDescription("Hồ sơ tổng hợp giáo viên trong học kỳ.");
            return;
        }
        if (path.equals("/api/assignment-rounds/{id}/readiness")) {
            Operation operation = item.getGet();
            operation.setTags(List.of("Chuẩn bị đợt"));
            operation.setSummary("Kiểm tra dữ liệu sẵn sàng cho đợt phân công");
            operation.setDescription("Tổng hợp số cặp lớp–môn theo phạm vi, lỗi thiếu dữ liệu, thành phần chưa đủ và cảnh báo từ schema sống. "
                + "Nhu cầu chưa có giáo viên đủ điều kiện là cảnh báo vì BR-15 cho phép DRAFT còn nhu cầu chưa gán. "
                + "can_run_solver chỉ phản ánh điều kiện dữ liệu cơ bản tại source_revision_token trả về; "
                + "lượt chạy sau này vẫn phải đối chiếu token, phiên bản và quy tắc cấu hình riêng.");
            documentParameters(operation);
            documentResponses(operation, PathItem.HttpMethod.GET, true);
            ApiResponse success = operation.getResponses().get("200");
            success.setDescription("Báo cáo sẵn sàng của đợt.");
            Content content = success.getContent();
            if (content == null) {
                content = new Content();
                success.setContent(content);
            }
            MediaType json = content.get("application/json");
            if (json == null) {
                json = new MediaType().schema(new Schema<>().$ref("#/components/schemas/RoundReadinessDto"));
                content.addMediaType("application/json", json);
            }
            json.setExample(Map.of(
                    "round_id", 2,
                    "semester_id", 1,
                    "source_revision_token", "token-hien-tai",
                    "can_run_solver", false,
                    "scope_summaries", List.of(Map.of(
                        "scope_id", 6,
                        "grade_id", 1,
                        "subject_id", 2,
                        "confirmed", false,
                        "class_count", 3,
                        "applicable_count", 2,
                        "not_applicable_count", 0,
                        "undetermined_count", 1,
                        "missing_applicability_count", 0,
                        "applicable_missing_demand_count", 1)),
                    "missing_data", List.of(),
                    "incomplete_components", List.of(Map.of(
                        "code", "ROUND_SCOPE_UNCONFIRMED",
                        "resource_type", "assignment_round",
                        "resource_id", 2,
                        "message", "Chưa xác nhận phạm vi đợt.")),
                    "warnings", List.of()));
            return;
        }
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
            if (method == PathItem.HttpMethod.POST || method == PathItem.HttpMethod.PUT) {
                addRequestExample(operation, examples.get(resource));
            }
            documentResponses(operation, method, byId);
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
