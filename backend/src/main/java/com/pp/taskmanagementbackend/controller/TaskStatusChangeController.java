package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import com.pp.taskmanagementbackend.repository.TaskStatusRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tasks")
public class TaskStatusChangeController {

    private final TaskRepository taskRepo;
    private final TaskStatusRepository statusRepo;

    public TaskStatusChangeController(TaskRepository taskRepo, TaskStatusRepository statusRepo) {
        this.taskRepo = taskRepo;
        this.statusRepo = statusRepo;
    }

    /** Request-Payload nur für den Statuswechsel. */
    public record StatusChangePayload(String statusCode) {}

    /**
     * PATCH /api/tasks/{id}/status
     * Body: { "statusCode": "IN_BEARBEITUNG" }
     *
     * Validiert, dass der Status existiert (und aktiv ist), setzt tasks.status_code und speichert.
     * Antwort: 204 No Content (kein DTO geändert).
     */
    @PatchMapping("/{id}/status")
    @Transactional
    public ResponseEntity<Void> patchStatus(@PathVariable("id") Long id, @RequestBody StatusChangePayload payload) {
        if (payload == null || payload.statusCode() == null || payload.statusCode().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        final String code = payload.statusCode().trim();

        var status = statusRepo.findByCode(code)
                .filter(s -> s.isActive()) // nur aktive Status erlauben
                .orElseThrow(() -> new IllegalArgumentException("Unknown or inactive status code: " + code));

        Task t = taskRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + id));

        // setze neuen Status-Code (FK ist ON UPDATE CASCADE via Migration)
        t.setStatusCode(status.getCode());
        taskRepo.save(t);

        return ResponseEntity.noContent().build();
    }
}
