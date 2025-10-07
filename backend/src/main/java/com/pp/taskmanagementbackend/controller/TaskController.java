package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.api.dto.TaskDto;
import com.pp.taskmanagementbackend.mapper.TaskMapper;
import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.model.TaskStatus;
import com.pp.taskmanagementbackend.service.TaskService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    // --- Helpers ---
    private Task requireTask(Long id) {
        Task t = service.findById(id);
        if (t == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task " + id + " not found");
        return t;
    }

    // --- CRUD ---

    @GetMapping
    public List<TaskDto> list() {
        return service.findAll().stream().map(TaskMapper::toDto).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public TaskDto get(@PathVariable Long id) {
        return TaskMapper.toDto(requireTask(id));
    }

    @PostMapping
    public ResponseEntity<TaskDto> create(@RequestBody TaskDto dto) {
        if (dto.getBezeichnung() == null || dto.getBezeichnung().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bezeichnung ist erforderlich");
        }
        if (dto.getArbeitsstation() == null || dto.getArbeitsstation().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arbeitsstation ist erforderlich");
        }
        if (dto.getStatus() == null) {
            dto.setStatus(TaskStatus.NEU);
        }

        Task entity = TaskMapper.toEntity(dto);
        Task saved = service.save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(TaskMapper.toDto(saved));
    }

    @PatchMapping("/{id}")
    public TaskDto patch(@PathVariable Long id, @RequestBody TaskDto dto) {
        Task entity = requireTask(id);
        TaskMapper.updateEntityFromDto(dto, entity);
        Task saved = service.save(entity);
        return TaskMapper.toDto(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        requireTask(id);
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Optional: dedizierter Status-Endpoint
    @PatchMapping("/{id}/status")
    public TaskDto patchStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Task entity = requireTask(id);
        String raw = body.get("status");
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status fehlt");
        }
        try {
            entity.setStatus(TaskStatus.valueOf(raw));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ungültiger Status: " + raw);
        }
        Task saved = service.save(entity);
        return TaskMapper.toDto(saved);
    }
}
