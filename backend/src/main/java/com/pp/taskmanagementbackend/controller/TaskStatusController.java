package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.TaskStatusEntity;
import com.pp.taskmanagementbackend.service.TaskStatusService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Minimaler Read-Controller für Status.
 * GET /api/statuses?activeOnly=true|false
 */
@RestController
@RequestMapping("/api/statuses")
public class TaskStatusController {

    private final TaskStatusService service;

    public TaskStatusController(TaskStatusService service) {
        this.service = service;
    }

    // schlanker View-DTO (nur Anzeige-relevante Felder)
    public record TaskStatusView(
            String code,
            String label,
            String colorBg,
            String colorFg,
            Integer sortOrder,
            boolean isFinal,
            boolean active
    ) {
        public static TaskStatusView fromEntity(TaskStatusEntity e) {
            return new TaskStatusView(
                    e.getCode(),
                    e.getLabel(),
                    e.getColorBg(),
                    e.getColorFg(),
                    e.getSortOrder(),
                    e.isFinal(),
                    e.isActive()
            );
        }
    }

    @GetMapping
    public ResponseEntity<List<TaskStatusView>> list(@RequestParam(name = "activeOnly", defaultValue = "true") boolean activeOnly) {
        var list = activeOnly ? service.listActive() : service.listAll();
        var body = list.stream().map(TaskStatusView::fromEntity).toList();
        return ResponseEntity.ok(body);
    }
}
