package com.pp.taskmanagementbackend.service;


import com.pp.taskmanagementbackend.config.StorageProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
public class AttachmentStorageService {

    private static final Logger log = LoggerFactory.getLogger(AttachmentStorageService.class);

    private final Path baseDir;

    public AttachmentStorageService(com.pp.taskmanagementbackend.config.StorageProperties storage) {
    	String cfg = storage.getAttachments().getBasePath();
        if (java.nio.file.Paths.get(cfg) == null) {
            throw new IllegalStateException("Konfiguration fehlt: 'attachments.base-path' ist nicht gesetzt.");
        }
        Path p = java.nio.file.Paths.get(cfg).toAbsolutePath().normalize();

        try {
            // Basisverzeichnis sicherstellen
            if (!java.nio.file.Files.exists(p)) {
                java.nio.file.Files.createDirectories(p);
            }
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Konnte Attachments-Basisverzeichnis nicht erstellen: " + p, e);
        }

        if (!java.nio.file.Files.isDirectory(p))  throw new IllegalStateException("Attachments-Basis ist kein Verzeichnis: " + p);
        if (!java.nio.file.Files.isReadable(p))   throw new IllegalStateException("Attachments-Basis nicht lesbar: " + p);
        if (!java.nio.file.Files.isWritable(p))   throw new IllegalStateException("Attachments-Basis nicht schreibbar: " + p);

        this.baseDir = p;
        log.info("[Attachments] Base initialisiert: {}", this.baseDir);
    }

    @PostConstruct
    void logBaseDir() {
        try {
            Files.createDirectories(baseDir);
            log.info("[Attachments] Base dir: {}", baseDir);
        } catch (IOException e) {
            log.error("[Attachments] Failed to create base dir {}: {}", baseDir, e.getMessage(), e);
        }
    }

    public String store(org.springframework.web.multipart.MultipartFile file) throws IOException {
        Files.createDirectories(baseDir);
        String key = UUID.randomUUID().toString().replace("-", "");
        Path target = baseDir.resolve(key);
        Files.copy(file.getInputStream(), target);
        log.debug("[Attachments] Stored file name='{}' size={} bytes as key={} in {}",
                file.getOriginalFilename(), file.getSize(), key, target);
        return key;
    }

    public Resource loadAsResource(String storageKey) {
        Path p = baseDir.resolve(storageKey);
        log.debug("[Attachments] Loading resource key={} from {}", storageKey, p);
        return new FileSystemResource(p.toFile());
    }

    public void delete(String storageKey) throws IOException {
        Path p = baseDir.resolve(storageKey);
        boolean deleted = Files.deleteIfExists(p);
        log.debug("[Attachments] Delete key={} path={} deleted={}", storageKey, p, deleted);
    }
}
