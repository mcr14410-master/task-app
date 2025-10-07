package com.pp.taskmanagementbackend.repository;

import com.pp.taskmanagementbackend.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findAllByArbeitsstationOrderByPrioritaetAscIdAsc(String arbeitsstation);
}
