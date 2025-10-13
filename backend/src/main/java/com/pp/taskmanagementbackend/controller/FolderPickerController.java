package com.pp.taskmanagementbackend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.pp.taskmanagementbackend.service.FolderPickerService;

import java.io.IOException;
import java.nio.file.DirectoryNotEmptyException;
import java.nio.file.NoSuchFileException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/fs")
public class FolderPickerController {
	private static final Logger log = LoggerFactory.getLogger(FolderPickerController.class);

    private final FolderPickerService folderPickerService;

    public FolderPickerController(FolderPickerService folderPickerService) {
        this.folderPickerService = folderPickerService;
        log.info("[FolderPicker] Controller initialisiert.");
    }

    // ---- Basislabel: { "label": "<voller Pfad>" }
    @GetMapping("/base-label")
    public Map<String, String> baseLabel() {
        String label = folderPickerService.getBase().toString();
        log.info("[FolderPicker] /api/fs/base-label -> {}", label);
        return Map.of("label", label);
    }

    // ---- Subfolder-Liste: { "folders": [ "a", "b", ... ] }
    @GetMapping("/subfolders")
    public Map<String, List<String>> subfolders(@RequestParam(value = "sub", required = false) String sub) throws IOException {
        return Map.of("folders", folderPickerService.subfolders(sub));
    }

    // ---- Exists: { "exists": true|false }
    @GetMapping("/exists")
    public Map<String, Boolean> exists(@RequestParam(value = "sub", required = false) String sub) {
        return Map.of("exists", folderPickerService.exists(sub));
    }

    // ---- Mkdir: 204 No Content
    @PostMapping("/mkdir")
    public ResponseEntity<Void> mkdir(
            @RequestParam(value = "sub", required = false) String sub,
            @RequestParam("name") String name
    ) throws IOException {
        folderPickerService.mkdir(sub, name);
        return ResponseEntity.noContent().build();
    }

    // ---- Empty: { "empty": true|false }
    @GetMapping("/empty")
    public Map<String, Boolean> isEmpty(
            @RequestParam(value = "sub", required = false) String sub,
            @RequestParam("name") String name
    ) throws IOException {
        return Map.of("empty", folderPickerService.isEmpty(sub, name));
    }

    // ---- Rmdir: 204 No Content
    @DeleteMapping("/rmdir")
    public ResponseEntity<Void> rmdir(
            @RequestParam(value = "sub", required = false) String sub,
            @RequestParam("name") String name
    ) throws IOException {
        folderPickerService.rmdir(sub, name);
        return ResponseEntity.noContent().build();
    }

    // ---- (Optional) Rename: 204 No Content
    @PostMapping("/rename")
    public ResponseEntity<Void> rename(
            @RequestParam(value = "sub", required = false) String sub,
            @RequestParam("from") String from,
            @RequestParam("to") String to
    ) throws IOException {
        folderPickerService.rename(sub, from, to);
        return ResponseEntity.noContent().build();
    }

    // ---------------- Fehlerbehandlung ----------------

    @ExceptionHandler(DirectoryNotEmptyException.class)
    public ResponseEntity<Map<String, String>> handleNotEmpty(DirectoryNotEmptyException ex) {
        return error(HttpStatus.CONFLICT, "Ordner ist nicht leer", ex.getMessage());
    }

    @ExceptionHandler(NoSuchFileException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NoSuchFileException ex) {
        return error(HttpStatus.NOT_FOUND, "Ordner/Datei nicht gefunden", ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return error(HttpStatus.BAD_REQUEST, "Ungültige Anfrage", ex.getMessage());
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<Map<String, String>> handleIO(IOException ex) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "I/O-Fehler", ex.getMessage());
    }

    private ResponseEntity<Map<String, String>> error(HttpStatus status, String error, String detail) {
        Map<String, String> body = new HashMap<>();
        body.put("error", error);
        if (detail != null) body.put("detail", detail);
        return ResponseEntity.status(status).body(body);
    }
}
