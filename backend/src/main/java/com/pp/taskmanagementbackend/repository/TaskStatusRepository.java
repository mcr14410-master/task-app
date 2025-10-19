package com.pp.taskmanagementbackend.repository;

import com.pp.taskmanagementbackend.model.TaskStatusEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskStatusRepository extends JpaRepository<TaskStatusEntity, UUID> {
    Optional<TaskStatusEntity> findByCode(String code);
    boolean existsByCode(String code);
    List<TaskStatusEntity> findAllByActiveTrueOrderBySortOrderAscLabelAsc();
    List<TaskStatusEntity> findAllByOrderBySortOrderAscLabelAsc();
}
