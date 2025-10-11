package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.config.AttachmentsProperties;
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

    public AttachmentStorageService(AttachmentsProperties props) {
        this.baseDir = Path.of(props.getBasePath()).toAbsolutePath();
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
