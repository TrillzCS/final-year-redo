package com.kanoga.kanoga_backend.activity;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activity")
public class ActivityController {

    private final ActivityService activity;

    public ActivityController(ActivityService activity) {
        this.activity = activity;
    }

    @GetMapping
    public List<ActivityEntryDto> recent(@RequestParam(defaultValue = "25") int limit) {
        return activity.recent(limit);
    }

    @GetMapping("/entity")
    public List<ActivityEntryDto> forEntity(@RequestParam String type, @RequestParam String id) {
        return activity.forEntity(type, UUID.fromString(id));
    }
}
