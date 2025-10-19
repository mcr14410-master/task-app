package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import com.pp.taskmanagementbackend.events.TaskEventPublisher;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository repository;
    private final TaskEventPublisher publisher;

    public TaskService(TaskRepository repository, TaskEventPublisher publisher) {
        this.repository = repository;
        this.publisher = publisher;
    }

    /** Neu: von Controller genutzt */
    public List<Task> findAll() {
        return repository.findAll();
    }

    public Task findById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public Task save(Task t) {
        Task saved = repository.save(t);
        if (saved != null) {
            // Hinweis: Wenn du zwischen create/update unterscheiden willst,
            // mach das im Controller (POST->onTaskCreated, PUT/PATCH->onTaskUpdated).
            publisher.onTaskUpdated();
        }
        return saved;
    }

    public void delete(Long id) {
        repository.deleteById(id);
        publisher.onTaskDeleted();
    }
}
