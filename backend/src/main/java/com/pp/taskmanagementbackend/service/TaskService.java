package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository repository;

    public TaskService(TaskRepository repository) {
        this.repository = repository;
    }

    public List<Task> findAll() {
        return repository.findAll();
    }

    public Task findById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public Task save(Task t) {
        return repository.save(t);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
