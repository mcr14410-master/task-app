package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.service.FilePickerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

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
    
    @Value("${filepicker.base-path}")
    private String basePath;

    @GetMapping("/base-label")
    public Map<String, String> getBaseLabel() {
      // Nur Anzeigezweck. Keine Rechteprüfung nötig, da es rein statisch aus config kommt.
      return Map.of("baseLabel", basePath);
    }

    @GetMapping("/subfolders")
    public Map<String, Object> subfolders(@RequestParam(required = false) String sub) throws Exception {
        return Map.of("folders", service.listSubfolders(sub));
    }

    @GetMapping("/exists")
    public Map<String, Object> exists(@RequestParam(required = false) String sub) {
        return Map.of("exists", service.exists(sub));
    }

    @PostMapping("/mkdir")
    public Map<String, Object> mkdir(@RequestParam(required = false) String sub,
                                     @RequestParam String name) throws Exception {
        service.mkdir(sub, name);
        return Map.of("ok", true);
    }

    @PostMapping("/rename")
    public Map<String, Object> rename(@RequestParam(required = false) String sub,
                                      @RequestParam String from,
                                      @RequestParam String to) throws Exception {
        service.rename(sub, from, to);
        return Map.of("ok", true);
    }

    // NEU: Empty-Check (für deaktivierte Mülltonne)
    @GetMapping("/empty")
    public Map<String, Object> empty(@RequestParam(required = false) String sub,
                                     @RequestParam String name) throws Exception {
        boolean empty = service.isEmpty(sub, name);
        return Map.of("empty", empty);
    }

    // NEU: Nur-leer-Löschen
    @DeleteMapping("/rmdir")
    public Map<String, Object> rmdir(@RequestParam(required = false) String sub,
                                     @RequestParam String name) throws Exception {
        log.debug("FS rmdir(empty-only): sub='{}', name='{}'", sub, name);
        service.rmdirEmpty(sub, name);
        return Map.of("ok", true);
    }
}
