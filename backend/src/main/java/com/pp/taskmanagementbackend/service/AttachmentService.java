package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.model.Attachment;
import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.AttachmentRepository;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
public class AttachmentService {

    private final AttachmentRepository repo;
    private final AttachmentStorageService storage;
    private final TaskRepository taskRepo;

    public AttachmentService(AttachmentRepository repo, AttachmentStorageService storage, TaskRepository taskRepo) {
        this.repo = repo;
        this.storage = storage;
        this.taskRepo = taskRepo;
    }

    private Task requireTask(Long id){
        return taskRepo.findById(id).orElseThrow(() -> new RuntimeException("Task " + id + " not found"));
    }

    public List<Attachment> list(Long taskId) {
        Task task = requireTask(taskId);
        return repo.findByTask(task);
    }

    @Transactional
    public Attachment upload(Long taskId, MultipartFile file) throws IOException {
        Task task = requireTask(taskId);
        String key = storage.store(file);
        Attachment a = new Attachment();
        a.setTask(task);
        a.setFilename(file.getOriginalFilename());
        a.setMime(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        a.setSize(file.getSize());
        a.setStorageKey(key);
        return repo.save(a);
    }

    public Attachment get(Long taskId, Long attId) {
        return repo.findByIdAndTaskId(attId, taskId).orElseThrow(() -> new RuntimeException("Attachment not found"));
    }

    @Transactional
    public void delete(Long taskId, Long attId) throws IOException {
        Attachment a = get(taskId, attId);
        storage.delete(a.getStorageKey());
        repo.delete(a);
    }
}
