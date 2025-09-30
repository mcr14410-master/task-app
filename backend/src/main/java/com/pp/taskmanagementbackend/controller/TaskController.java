package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import com.pp.taskmanagementbackend.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;
    private final TaskRepository taskRepository;

    public TaskController(TaskService taskService, TaskRepository taskRepository) {
        this.taskService = taskService;
        this.taskRepository = taskRepository;
    }

    // --- 0) Alle Tasks (NEU) ---
    @GetMapping
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    // --- 0b) Einzel-Task lesen (optional, sinnvoll für Details) ---
    @GetMapping("/{id}")
    public ResponseEntity<Task> getOne(@PathVariable Long id) {
        return taskRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // --- 1) Bulk-Sortierung / Stationswechsel ---
    @PutMapping("/sort")
    public ResponseEntity<Void> updateTasksSorting(@RequestBody List<@Valid Task> tasksToUpdate) {
        taskService.updateTasksSorting(tasksToUpdate);
        return ResponseEntity.ok().build();
    }

    // --- 2a) Tasks pro Station (robust; expliziter Pfad) ---
    @GetMapping("/by-station/{station}")
    public List<Task> getTasksByStationExplicit(@PathVariable String station) {
        return taskService.findByStationNormalized(station);
    }

    // --- 2b) (ENTFERNT/DEAKTIVIERT) Legacy-Route war kollisionsgefährdet:
    // @GetMapping("/{station}")
    // public List<Task> getTasksByStation(@PathVariable String station) {
    //     return taskService.findByStationNormalized(station);
    // }

    // --- 3) Task anlegen (Validation + Fallbacks) ---
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Task createTask(@Valid @RequestBody Task task) {
        if (task.getPrioritaet() == null) {
            task.setPrioritaet(9999);
        }
        if (task.getZusätzlicheInfos() != null && task.getZusätzlicheInfos().trim().isEmpty()) {
            task.setZusätzlicheInfos(null);
        }
        if (task.getArbeitsstation() != null) {
            task.setArbeitsstation(task.getArbeitsstation().trim().replaceAll("\\s+", " "));
        }

        ensureDefaultStatus(task);
        return taskRepository.save(task);
    }

    // --- 4) Task löschen ---
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        if (taskRepository.existsById(id)) {
            taskRepository.deleteById(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    // --- 5) Einzel-Update (PUT/PATCH) ---
    @RequestMapping(method = {RequestMethod.PUT, RequestMethod.PATCH}, value = "/{id}")
    public ResponseEntity<Task> updateTaskDetails(@PathVariable Long id, @Valid @RequestBody Task updatedTask) {
        Task savedTask = taskService.updateTaskDetails(id, updatedTask);
        return ResponseEntity.ok(savedTask);
    }

    // --- Default-Status setzen (String/Enum-agnostisch) ---
    private void ensureDefaultStatus(Task task) {
        try {
            Method getter = Task.class.getMethod("getStatus");
            Object current = getter.invoke(task);
            if (current != null) return;

            Method setter = null;
            Class<?> paramType = null;
            for (Method m : Task.class.getMethods()) {
                if (m.getName().equals("setStatus") && m.getParameterCount() == 1) {
                    setter = m; paramType = m.getParameterTypes()[0]; break;
                }
            }
            if (setter == null || paramType == null) return;

            if (String.class.equals(paramType)) {
                setter.invoke(task, "NEU");
                return;
            }
            if (paramType.isEnum()) {
                Object value = null;
                try {
                    @SuppressWarnings({"rawtypes", "unchecked"})
                    Object candidate = Enum.valueOf((Class<Enum>) paramType, "NEU");
                    value = candidate;
                } catch (IllegalArgumentException ignored) {
                    Object[] constants = paramType.getEnumConstants();
                    if (constants != null && constants.length > 0) value = constants[0];
                }
                if (value != null) setter.invoke(task, value);
            }
        } catch (Exception ignored) {
            // Fallback darf keine Exception werfen
        }
    }
}
