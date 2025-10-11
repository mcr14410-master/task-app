package com.pp.taskmanagementbackend.repository;

import com.pp.taskmanagementbackend.model.Attachment;
import com.pp.taskmanagementbackend.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByTask(Task task);
    Optional<Attachment> findByIdAndTaskId(Long id, Long taskId);
    long countByTaskId(Long taskId);
}
