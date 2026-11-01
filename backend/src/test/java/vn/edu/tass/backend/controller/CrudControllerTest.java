package vn.edu.tass.backend.controller;

import vn.edu.tass.backend.controller.CrudController;
import vn.edu.tass.backend.exception.ApiExceptionHandler;
import vn.edu.tass.backend.service.CrudService;

import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class CrudControllerTest {
    private final CrudService service = mock(CrudService.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new CrudController(service))
        .setControllerAdvice(new ApiExceptionHandler()).build();

    @Test
    void exposesGetPostPutAndDeleteWithExpectedHttpStatus() throws Exception {
        Map<String, Object> teacher = Map.of("id", 5L, "school_id", 1L, "teacher_code", "GV5", "full_name", "Lan");
        when(service.list("teachers", 20, 0)).thenReturn(List.of(teacher));
        when(service.get("teachers", 5L)).thenReturn(teacher);
        when(service.create(eq("teachers"), anyMap())).thenReturn(teacher);
        when(service.replace(eq("teachers"), eq(5L), anyMap())).thenReturn(teacher);

        mvc.perform(get("/api/teachers"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(5));
        mvc.perform(get("/api/teachers/5"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.teacher_code").value("GV5"));
        mvc.perform(post("/api/teachers").contentType(MediaType.APPLICATION_JSON)
                .content("{\"school_id\":1,\"teacher_code\":\"GV5\",\"full_name\":\"Lan\"}"))
            .andExpect(status().isCreated()).andExpect(header().string("Location", "/api/teachers/5"))
            .andExpect(jsonPath("$.id").value(5))
            .andExpect(jsonPath("$.fields").doesNotExist());
        verify(service).create("teachers", Map.of("school_id", 1, "teacher_code", "GV5", "full_name", "Lan"));
        mvc.perform(put("/api/teachers/5").contentType(MediaType.APPLICATION_JSON)
                .content("{\"school_id\":1,\"teacher_code\":\"GV5\",\"full_name\":\"Lan\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(5));
        mvc.perform(delete("/api/teachers/5")).andExpect(status().isNoContent());
    }
}
