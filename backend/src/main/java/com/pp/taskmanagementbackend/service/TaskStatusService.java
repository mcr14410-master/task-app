package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.model.TaskStatusEntity;
import com.pp.taskmanagementbackend.repository.TaskStatusRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TaskStatusService {

    private final TaskStatusRepository repository;

    public TaskStatusService(TaskStatusRepository repository) {
        this.repository = repository;
    }

    /**
     * Liefert alle aktiven Status sortiert (sort_order, label).
     */
    public List<TaskStatusEntity> listActive() {
        return repository.findAllByActiveTrueOrderBySortOrderAscLabelAsc();
    }

    /**
     * Liefert alle Status (inklusive inaktive), sortiert.
     */
    public List<TaskStatusEntity> listAll() {
        return repository.findAllByOrderBySortOrderAscLabelAsc();
    }

    /**
     * Einzelnen Status per Code suchen (Optional).
     */
    public Optional<TaskStatusEntity> findByCode(String code) {
        return repository.findByCode(code);
    }
}
