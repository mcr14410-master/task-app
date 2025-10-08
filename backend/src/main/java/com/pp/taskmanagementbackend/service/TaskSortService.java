package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.api.dto.TaskSortRequest;
import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.model.Arbeitsstation;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import com.pp.taskmanagementbackend.repository.ArbeitsstationRepository;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

/**
 * Robustes Sortieren für DnD: transaktional, optional mit Optimistic Locking (falls @Version am Task vorhanden).
 */
@Service
public class TaskSortService {

    private final TaskRepository taskRepo;
    private final ArbeitsstationRepository arbeitsstationRepo;

    public TaskSortService(TaskRepository taskRepo, ArbeitsstationRepository arbeitsstationRepo) {
        this.taskRepo = taskRepo;
        this.arbeitsstationRepo = arbeitsstationRepo;
    }

    /** Wird vom TaskController aufgerufen. */
    public void sort(TaskSortRequest req) {
        if (req == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Leere Sortier-Anfrage");
        }
        if (req.getTaskId() == null || req.getToIndex() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "taskId/toIndex fehlen");
        }
        if (req.getTo() == null || req.getTo().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ziel-Station 'to' fehlt");
        }
        moveTask(req.getTaskId(), req.getTo(), req.getToIndex());
    }

    /**
     * Verschiebt einen Task in eine Ziel-Station an einen Ziel-Index
     * und vergibt Prioritäten (0..n-1) neu.
     */
    @Transactional
    public void moveTask(long taskId, String toStationName, int toIndex) {
        try {
            // 1) Ziel-Station validieren & laden
            Arbeitsstation station = arbeitsstationRepo.findByName(toStationName)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Station nicht gefunden: " + toStationName));

            // 2) Liste in Zielstation frisch laden (Versionen aktuell)
            List<Task> list = new ArrayList<>(
                taskRepo.findAllByArbeitsstationOrderByPrioritaetAscIdAsc(station.getName())
            );

            // 3) Zu verschiebenden Task laden (unabhängig von seiner aktuellen Station)
            Task moving = (Task) taskRepo.findById(taskId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task nicht gefunden: " + taskId));

            // 4) Falls Task bereits in der Liste ist: erst entfernen
            list.removeIf(t -> ((Task) t).getId() == taskId);

            // 5) Zielindex clampen & Station setzen
            int idx = Math.max(0, Math.min(toIndex, list.size()));
            moving.setArbeitsstation(station.getName());
            list.add(idx, moving);

            // 6) Prioritäten komplett neu vergeben (0..n-1)
            for (int i = 0; i < list.size(); i++) {
                ((Task) list.get(i)).setPrioritaet(i);
            }

            // 7) Speichern; @Version am Task (falls vorhanden) triggert Konflikt-Erkennung
            taskRepo.saveAll(list);

        } catch (OptimisticLockingFailureException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Konflikt: Liste wurde parallel geändert", ex);
        }
    }
}
