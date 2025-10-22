package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.events.TaskEventPublisher;
import com.pp.taskmanagementbackend.model.Attachment;
import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.AttachmentRepository;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Zentrale Task-Domänenlogik.
 * - Save/Update: publisht ein Update-Event.
 * - Delete: löscht vor dem DB-Delete die physischen Attachments (best effort) und publisht ein Delete-Event.
 */
@Service
public class TaskService {

    private static final Logger log = LoggerFactory.getLogger(TaskService.class);

    private final TaskRepository repository;
    private final TaskEventPublisher publisher;
    private final AttachmentStorageService attachmentStorageService;
    private final AttachmentRepository attachmentRepository;

    public TaskService(TaskRepository repository,
                       TaskEventPublisher publisher,
                       AttachmentStorageService attachmentStorageService,
                       AttachmentRepository attachmentRepository) {
        this.repository = repository;
        this.publisher = publisher;
        this.attachmentStorageService = attachmentStorageService;
        this.attachmentRepository = attachmentRepository;
    }

    /** Liefert alle Tasks (ggf. später paging/filters ergänzen). */
    public List<Task> findAll() {
        return repository.findAll();
    }

    /**
     * Erzeugt/aktualisiert einen Task.
     * Hinweis: Zwischen create/update unterscheiden (POST vs. PUT/PATCH) gerne im Controller;
     * hier wird pauschal ein "updated"-Event gefeuert.
     */
    public Task save(Task t) {
        Task saved = repository.save(t);
        if (saved != null) {
            publisher.onTaskUpdated();
        }
        return saved;
    }

    /**
     * Löscht einen Task:
     * 1) Holt Attachments über AttachmentRepository (ohne Task#getAttachments()).
     * 2) Löscht zugehörige Dateien im Dateisystem (best effort).
     * 3) Entfernt den Task aus der DB.
     * 4) Publisht ein Delete-Event.
     */
    @Transactional
    public void delete(Long id) {
        Task task = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + id));

        // 1) Attachments zu diesem Task laden
        List<Attachment> attachments = attachmentRepository.findByTask(task);

        // 2) Physische Dateien löschen (best effort)
        if (attachments != null && !attachments.isEmpty()) {
            for (Attachment att : attachments) {
                try {
                    // ⬇️ Falls dein Feld anders heißt (z. B. getPath()/getRelativePath()), hier anpassen.
                    String storageKey = att.getStorageKey();
                    if (storageKey != null && !storageKey.isBlank()) {
                        attachmentStorageService.delete(storageKey);
                        log.debug("[Attachments] Deleted file for key={} (taskId={})", storageKey, id);
                    }
                } catch (Exception ex) {
                    // Dateien dürfen den Löschvorgang nicht blockieren
                    log.warn("[Attachments] Could not delete file for taskId={}, attachmentId={}, reason={}",
                            id, att.getId(), ex.toString());
                }
            }
        }

        // 3) DB-Delete
        repository.delete(task);

        // 4) Event
        publisher.onTaskDeleted();
    }
    
    
    @Transactional(readOnly = true)
    public Task findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + id));
    }
}
