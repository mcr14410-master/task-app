package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.api.dto.TaskDto;
import com.pp.taskmanagementbackend.api.dto.TaskSortRequest;
import com.pp.taskmanagementbackend.mapper.TaskMapper;
import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.model.TaskStatus;
import com.pp.taskmanagementbackend.service.TaskService;
import com.pp.taskmanagementbackend.service.TaskSortService;
import com.pp.taskmanagementbackend.repository.AttachmentRepository;
import com.pp.taskmanagementbackend.events.TaskEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.ArrayList;

@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService service;
    private final TaskSortService sortService;
    private static final Logger log = LoggerFactory.getLogger(TaskController.class);
    private final AttachmentRepository attachmentRepository;
    private final TaskEventPublisher publisher;


    public TaskController(TaskService service,
            TaskSortService sortService,
            AttachmentRepository attachmentRepository,
            TaskEventPublisher publisher) {
this.service = service;
this.sortService = sortService;
this.attachmentRepository = attachmentRepository;
        this.publisher = publisher;
}

    private Task requireTask(Long id) {
        Task t = service.findById(id);
        if (t == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task " + id + " not found");
        return t;
    }

    @GetMapping
    public List<TaskDto> list() {
        List<Task> entities = service.findAll(); // oder deine bestehende Methode
        List<TaskDto> out = new ArrayList<>(entities.size());
        
        for (Task t : entities) {
            TaskDto dto = TaskMapper.toDto(t);
            int cnt = Math.toIntExact(attachmentRepository.countByTaskId(t.getId()));
            dto.setAttachmentCount(Integer.valueOf(cnt));
            out.add(dto);
        }
        return out;
    }

    @GetMapping("/{id:\\d+}")
    public TaskDto get(@PathVariable Long id) {
        Task entity = requireTask(id);
        TaskDto dto = TaskMapper.toDto(entity);
        int cnt = Math.toIntExact(attachmentRepository.countByTaskId(id));
        dto.setAttachmentCount(Integer.valueOf(cnt));
        return dto;
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

    @PatchMapping("/{id:\\d+}")
    public TaskDto patch(@PathVariable Long id, @RequestBody TaskDto dto) {
        Task entity = requireTask(id);
        TaskMapper.updateEntityFromDto(dto, entity);
        Task saved = service.save(entity);
        return TaskMapper.toDto(saved);
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        requireTask(id);
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public TaskDto patchStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Task entity = requireTask(id);
        String raw = body.getOrDefault("status", null);
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

 // Akzeptiert BEIDE Frontend-Varianten
    public static class SortRequest {
      public Long arbeitsstationId;       // neue Variante
      public java.util.List<Long> orderedIds;
      public Long columnId;               // alte Variante
      public java.util.List<Long> order;

      public Long stationId() { return arbeitsstationId != null ? arbeitsstationId : columnId; }
      public java.util.List<Long> ids() { return orderedIds != null ? orderedIds : order; }
    }
    
    
    @PatchMapping("/sort")
    @Transactional
    public ResponseEntity<Void> sortPatch(@RequestBody SortRequest req) {
      log.info("DnD PATCH /sort payload: arbeitsstationId={}, orderedIds={}, columnId={}, order={}",
          req.arbeitsstationId, req.orderedIds, req.columnId, req.order);

      final Long station = req != null ? req.stationId() : null;
      final java.util.List<Long> ids = req != null ? req.ids() : null;

      if (station == null || ids == null || ids.isEmpty()) {
        log.warn("BadRequest /sort: station={} ids={}", station, ids);
        return ResponseEntity.badRequest().build();
      }

      try {
        sortService.applyOrder(station, ids);
        log.info("DnD /sort OK: station={} ids={}", station, ids);
        return ResponseEntity.noContent().build();
      } catch (Exception ex) {
        // Wichtig: KEIN 400 hier – wir wollen sehen, was passiert (Stacktrace im Log)
        log.error("DnD /sort FAILED: station={} ids={}", station, ids, ex);
        return ResponseEntity.status(500).build();
      }
    }
    
    @PutMapping("/sort") // Fallback
    @Transactional
    public ResponseEntity<Void> sortPut(@RequestBody SortRequest req) {
      log.info("DnD PUT /sort payload: arbeitsstationId={}, orderedIds={}, columnId={}, order={}",
          req.arbeitsstationId, req.orderedIds, req.columnId, req.order);

      Long station = req != null ? req.stationId() : null;
      java.util.List<Long> ids = req != null ? req.ids() : null;

      if (station == null || ids == null || ids.isEmpty()) {
        log.warn("BadRequest /sort (PUT): station={} ids={}", station, ids);
        return ResponseEntity.badRequest().build();
      }

      sortService.applyOrder(station, ids);
      publisher.onTaskUpdated();
      log.info("DnD /sort OK: station={} ids={}", station, ids);
      return ResponseEntity.noContent().build();
    }
    
    
    
}
