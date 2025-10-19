package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.TaskStatusEntity;
import com.pp.taskmanagementbackend.service.TaskStatusService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Status-Controller:
 *  - GET /api/statuses?activeOnly=true|false
 *  - POST /api/statuses
 *  - PUT  /api/statuses/{code}
 *  - DELETE /api/statuses/{code}   (Soft-Delete -> active=false)
 */
@RestController
@RequestMapping("/api/statuses")
public class TaskStatusController {

    private final TaskStatusService service;

    public TaskStatusController(TaskStatusService service) {
        this.service = service;
    }

    // Schlanker View-DTO (nur Anzeige-relevante Felder)
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

    // Payload für POST/PUT (alle Felder erlaubt; Validierung erfolgt im Service)
    public record TaskStatusPayload(
            String code,
            String label,
            String colorBg,
            String colorFg,
            Integer sortOrder,
            Boolean isFinal,
            Boolean active
    ) {
        public TaskStatusEntity toEntity() {
            var e = new TaskStatusEntity();
            e.setCode(code);
            e.setLabel(label);
            e.setColorBg(colorBg);
            e.setColorFg(colorFg);
            e.setSortOrder(sortOrder);
            e.setFinal(Boolean.TRUE.equals(isFinal));
            e.setActive(active == null || Boolean.TRUE.equals(active));
            return e;
        }
    }

    // -----------------------
    // GET
    // -----------------------
    @GetMapping
    public ResponseEntity<List<TaskStatusView>> list(@RequestParam(name = "activeOnly", defaultValue = "true") boolean activeOnly) {
        var list = activeOnly ? service.listActive() : service.listAll();
        var body = list.stream().map(TaskStatusView::fromEntity).toList();
        return ResponseEntity.ok(body);
    }

    // -----------------------
    // POST (Create)
    // -----------------------
    @PostMapping
    public ResponseEntity<TaskStatusView> create(@RequestBody TaskStatusPayload payload) {
        var created = service.create(payload.toEntity());
        return ResponseEntity.ok(TaskStatusView.fromEntity(created));
    }

    // -----------------------
    // PUT (Update; unterstützt Code-Umbenennung)
    // -----------------------
    @PutMapping("/{code}")
    public ResponseEntity<TaskStatusView> update(@PathVariable String code, @RequestBody TaskStatusPayload payload) {
        var updated = service.update(code, payload.toEntity());
        return ResponseEntity.ok(TaskStatusView.fromEntity(updated));
    }

    // -----------------------
    // DELETE (Soft-Delete -> active=false)
    // -----------------------
    @DeleteMapping("/{code}")
    public ResponseEntity<Void> delete(@PathVariable String code) {
        service.softDelete(code);
        return ResponseEntity.noContent().build();
    }
}
