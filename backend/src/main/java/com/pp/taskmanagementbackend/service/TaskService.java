package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.exception.TaskNotFoundException;
import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    // Hilfsfunktion: trim + Mehrfachspaces auf einen Space reduzieren
    private String normalizeStation(String s) {
        if (s == null) return null;
        String trimmed = s.trim();
        // Alle Whitespace-Blöcke zu einem normalen Space
        return trimmed.replaceAll("\\s+", " ");
    }

    // 1) Sortierung / Stationswechsel (Bulk)
    @Transactional
    public void updateTasksSorting(List<Task> tasksToUpdate) {
        for (Task task : tasksToUpdate) {
            if (task.getId() == null) {
                throw new IllegalArgumentException("Task ID fehlt bei Sortierung. Kann Sortierung nicht speichern.");
            }
            // ✅ Station normalisieren, Priorität übernehmen
            task.setArbeitsstation(normalizeStation(task.getArbeitsstation()));
            taskRepository.save(task);
        }
    }

    // 2) Einzel-Update (PUT/PATCH)
    @Transactional
    public Task updateTaskDetails(Long id, Task updatedTask) {
        Optional<Task> taskOptional = taskRepository.findById(id);
        if (taskOptional.isEmpty()) {
            throw new TaskNotFoundException("Task mit ID " + id + " nicht gefunden.");
        }

        Task existingTask = taskOptional.get();

        // Felder übernehmen (nur die, die im UI editierbar sind)
        existingTask.setBezeichnung(updatedTask.getBezeichnung());
        existingTask.setZusätzlicheInfos(updatedTask.getZusätzlicheInfos());
        existingTask.setTeilenummer(updatedTask.getTeilenummer());
        existingTask.setKunde(updatedTask.getKunde());
        existingTask.setZuständig(updatedTask.getZuständig());
        existingTask.setAufwandStunden(updatedTask.getAufwandStunden());
        existingTask.setEndDatum(updatedTask.getEndDatum());

        // ✅ Station normalisiert setzen
        existingTask.setArbeitsstation(normalizeStation(updatedTask.getArbeitsstation()));

        // Priorität absichtlich nicht hier ändern (passiert über /sort)

        return taskRepository.save(existingTask);
    }

    // 3) Löschen
    @Transactional
    public void deleteTask(Long id) {
        if (!taskRepository.existsById(id)) {
            throw new TaskNotFoundException("Task mit ID " + id + " nicht gefunden zum Löschen.");
        }
        taskRepository.deleteById(id);
    }

    // 4) Lesen nach Station (robust)
    @Transactional(readOnly = true)
    public List<Task> findByStationNormalized(String station) {
        String norm = normalizeStation(station);
        return taskRepository.findByStationNormalized(norm);
    }
}
