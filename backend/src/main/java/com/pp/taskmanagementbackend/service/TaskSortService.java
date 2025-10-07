package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.api.dto.TaskSortRequest;
import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import com.pp.taskmanagementbackend.repository.StationLookupRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
public class TaskSortService {

    private final TaskRepository taskRepository;
    private final TaskService taskService;
    private final StationLookupRepository stationLookup;

    public TaskSortService(TaskRepository taskRepository,
                           TaskService taskService,
                           StationLookupRepository stationLookup) {
        this.taskRepository = taskRepository;
        this.taskService = taskService;
        this.stationLookup = stationLookup;
    }

    @Transactional
    public void sort(TaskSortRequest req) {
      if (req.getTaskId() == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "taskId fehlt");
      }

      Task moved = taskService.findById(req.getTaskId());
      if (moved == null) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task " + req.getTaskId() + " nicht gefunden");
      }

      // Zielstation robust ermitteln (Name)
      String targetStation = (req.getTo() != null && !req.getTo().isBlank())
          ? req.getTo()
          : moved.getArbeitsstation(); // innerhalb derselben Spalte

      // Soft-Validation (wie von uns gebaut): StationLookupRepository.existsByName(targetStation)
      if (!stationLookup.existsByName(targetStation)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unbekannte Station: " + targetStation);
      }

      int toIndex = Math.max(0, req.getToIndex() == null ? Integer.MAX_VALUE : req.getToIndex());
      String sourceStation = moved.getArbeitsstation();

      List<Task> dest = new ArrayList<>(taskRepository.findAllByArbeitsstationOrderByPrioritaetAscIdAsc(targetStation));
      dest.removeIf(t -> t.getId().equals(moved.getId()));

      if (toIndex > dest.size()) toIndex = dest.size();
      moved.setArbeitsstation(targetStation);
      dest.add(toIndex, moved);

      for (int i = 0; i < dest.size(); i++) dest.get(i).setPrioritaet(i);
      taskRepository.saveAll(dest);

      if (!targetStation.equals(sourceStation)) {
        List<Task> src = taskRepository.findAllByArbeitsstationOrderByPrioritaetAscIdAsc(sourceStation);
        for (int i = 0; i < src.size(); i++) src.get(i).setPrioritaet(i);
        taskRepository.saveAll(src);
      }
    }
}
