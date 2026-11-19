package vn.edu.tass.backend.service;

import vn.edu.tass.backend.payload.dto.TeacherProfileDto;

public interface TeacherProfileService {
    TeacherProfileDto getProfile(long teacherId, long semesterId);
}
