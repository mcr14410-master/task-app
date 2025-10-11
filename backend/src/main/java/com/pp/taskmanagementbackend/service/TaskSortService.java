package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import com.pp.taskmanagementbackend.repository.ArbeitsstationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class TaskSortService {
  private static final Logger log = LoggerFactory.getLogger(TaskSortService.class);

  private final TaskRepository taskRepository;
  private final ArbeitsstationRepository arbeitsstationRepository;

  public TaskSortService(TaskRepository taskRepository,
                         ArbeitsstationRepository arbeitsstationRepository) {
    this.taskRepository = taskRepository;
    this.arbeitsstationRepository = arbeitsstationRepository;
  }

  @Transactional
  public void applyOrder(Long arbeitsstationId, List<Long> orderedIds) {
    if (arbeitsstationId == null || orderedIds == null || orderedIds.isEmpty()) {
      log.debug("applyOrder: nichts zu tun (stationId={}, ids={})", arbeitsstationId, orderedIds);
      return;
    }

    // Station-ID -> Name (text) auflösen
    final String stationName = arbeitsstationRepository.findById(arbeitsstationId)
        .map(a -> a.getName())                // <— falls Feld anders heißt: getBezeichnung()
        .orElse(String.valueOf(arbeitsstationId)); // Fallback

    // Tasks laden und in gewünschter Reihenfolge aktualisieren
    final List<Task> tasks = taskRepository.findAllById(orderedIds);
    final Map<Long, Task> byId = new HashMap<>();
    for (Task t : tasks) byId.put(t.getId(), t);

    int prio = 0;
    final List<Task> toSave = new ArrayList<>(orderedIds.size());
    for (Long id : orderedIds) {
      Task t = byId.get(id);
      if (t == null) continue;          // fehlende IDs freundlich überspringen
      t.setArbeitsstation(stationName); // **Name** speichern, nicht numerische ID
      t.setPrioritaet(Integer.valueOf(prio++));
      toSave.add(t);
    }

    if (!toSave.isEmpty()) {
      taskRepository.saveAll(toSave);
      log.info("applyOrder OK: station='{}' (id={}), ids={}", stationName, arbeitsstationId, orderedIds);
    }
  }
}