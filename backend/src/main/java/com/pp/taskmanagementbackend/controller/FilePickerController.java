package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.service.FilePickerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fs")
public class FilePickerController {

    private static final Logger log = LoggerFactory.getLogger(FilePickerController.class);

    private final FilePickerService service;

    public FilePickerController(FilePickerService service) {
        this.service = service;
        log.info("FilePicker aktiv. Base: {}", service.getBase());
    }

    /** Kompakter Health/Info-Endpunkt (optional). */
    @GetMapping("/info")
    public Map<String, Object> info() {
        return Map.of(
                "base", service.getBase().toString()
        );
    }

    /** Liste der Unterordner als { folders: [...] } */
    @GetMapping("/subfolders")
    public Map<String, Object> subfolders(@RequestParam(required = false) String sub) throws IOException {
        log.debug("FS subfolders: sub='{}'", sub);
        List<String> folders = service.listSubfolders(sub);
        return Map.of("folders", folders);
    }

    /** Alias für ältere Frontends: /list -> wie /subfolders */
    @GetMapping("/list")
    public Map<String, Object> list(@RequestParam(required = false) String sub) throws IOException {
        log.debug("FS list (alias): sub='{}'", sub);
        List<String> folders = service.listSubfolders(sub);
        return Map.of("folders", folders);
    }

    /** Existenzcheck als { exists: true|false } */
    @GetMapping("/exists")
    public Map<String, Object> exists(@RequestParam(required = false) String sub) {
        boolean ex = service.exists(sub);
        log.debug("FS exists: sub='{}' -> {}", sub, ex);
        return Map.of("exists", ex);
    }

    /** Ordner anlegen; Parameter via Query: sub (optional), name (required). */
    @PostMapping("/mkdir")
    public Map<String, Object> mkdir(@RequestParam(required = false) String sub,
                                     @RequestParam String name) throws Exception {
        log.debug("FS mkdir: sub='{}', name='{}'", sub, name);
        service.mkdir(sub, name);
        return Map.of("ok", true);
    }
}
