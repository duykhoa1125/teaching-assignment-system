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
            .description("20 nhóm CRUD dữ liệu đầu vào. JSON dùng snake_case; ngày YYYY-MM-DD; "
                + "thời điểm ISO 8601 có múi giờ. Chưa triển khai đăng nhập, phân quyền và API nghiệp vụ phase 2 tiếp theo. "
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
                .addProperty("message", new StringSchema().example("JSON hoặc tham số không hợp lệ")));
            openApi.getPaths().forEach((path, item) -> documentPath(path, item, examples));
        };
    }

    private static void documentPath(String path, PathItem item, Map<String, Map<String, Object>> examples) {
        if (!path.startsWith("/api/")) return;
        String resource = path.substring("/api/".length()).split("/")[0];
        String label = RESOURCES.get(resource);
        if (label == null) return;
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
        responses.addApiResponse("400", error("Request hoặc tham số không hợp lệ.", "Bad Request"));
        if (byId) {
            responses.addApiResponse("404", error("Không tìm thấy bản ghi.", "Not Found"));
        }
        if (method == PathItem.HttpMethod.POST || method == PathItem.HttpMethod.PUT
                || method == PathItem.HttpMethod.DELETE) {
            responses.addApiResponse("409", error("Trùng dữ liệu hoặc vi phạm khóa ngoại.", "Conflict"));
            responses.addApiResponse("422", error("Vi phạm ràng buộc dữ liệu PostgreSQL.", "Unprocessable Entity"));
        }
    }

    private static ApiResponse error(String description, String status) {
        Map<String, String> example = new LinkedHashMap<>();
        example.put("error", status);
        example.put("message", description);
        return new ApiResponse().description(description).content(new Content().addMediaType(
            "application/json", new MediaType()
                .schema(new Schema<>().$ref("#/components/schemas/ApiErrorResponse"))
                .example(example)));
    }
}
