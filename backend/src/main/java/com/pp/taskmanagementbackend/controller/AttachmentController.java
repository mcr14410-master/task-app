package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.api.dto.AttachmentDto;
import com.pp.taskmanagementbackend.mapper.AttachmentMapper;
import com.pp.taskmanagementbackend.model.Attachment;
import com.pp.taskmanagementbackend.service.AttachmentService;
import com.pp.taskmanagementbackend.service.AttachmentStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/tasks/{taskId}/attachments")
public class AttachmentController {

    private final AttachmentService service;
    private final AttachmentStorageService storage;

    public AttachmentController(AttachmentService service, AttachmentStorageService storage) {
        this.service = service;
        this.storage = storage;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AttachmentDto upload(@PathVariable Long taskId, @RequestPart("file") MultipartFile file) throws IOException {
        Attachment a = service.upload(taskId, file);
        return AttachmentMapper.toDto(a);
    }

    @GetMapping
    public List<AttachmentDto> list(@PathVariable Long taskId) {
        return service.list(taskId).stream().map(AttachmentMapper::toDto).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(@PathVariable Long taskId, @PathVariable Long id) {
        Attachment a = service.get(taskId, id);
        Resource resource = storage.loadAsResource(a.getStorageKey());
        ContentDisposition cd = ContentDisposition.attachment()
                .filename(a.getFilename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.getMime()))
                .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remove(@PathVariable Long taskId, @PathVariable Long id) throws IOException {
        service.delete(taskId, id);
        return ResponseEntity.noContent().build();
    }
}
