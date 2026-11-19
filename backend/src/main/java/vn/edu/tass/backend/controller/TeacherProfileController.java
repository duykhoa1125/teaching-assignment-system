package vn.edu.tass.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.tass.backend.payload.dto.TeacherProfileDto;
import vn.edu.tass.backend.service.TeacherProfileService;

@RestController
@RequestMapping("/api/teachers/{id}/profile")
@RequiredArgsConstructor
public class TeacherProfileController {
    private final TeacherProfileService service;

    @GetMapping
    public TeacherProfileDto retrieveProfile(@PathVariable long id,
            @RequestParam(name = "semester_id") long semesterId) {
        return service.getProfile(id, semesterId);
    }
}
