package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.AdditionalWork;
import com.pp.taskmanagementbackend.api.dto.AdditionalWorkDto;
import com.pp.taskmanagementbackend.repository.AdditionalWorkRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/additional-works")
public class AdditionalWorkController {

    private final AdditionalWorkRepository repo;

    public AdditionalWorkController(AdditionalWorkRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<List<AdditionalWorkDto>> list() {
        var all = repo.findAll();
        // map Entity -> DTO für saubere flags-Handhabung
        var dtoList = all.stream()
                .map(AdditionalWorkDto::fromEntity)
                .toList();
        return ResponseEntity.ok(dtoList);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdditionalWorkDto> get(@PathVariable Long id) {
        return repo.findById(id)
                .map(aw -> ResponseEntity.ok(AdditionalWorkDto.fromEntity(aw)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<AdditionalWorkDto> create(@RequestBody AdditionalWorkDto dto) {
        // Pflichtvalidierung
        if (dto.getCode() == null || dto.getCode().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (dto.getLabel() == null || dto.getLabel().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        AdditionalWork w = new AdditionalWork();
        dto.applyToNewEntity(w);

        var saved = repo.save(w);
        var body = AdditionalWorkDto.fromEntity(saved);

        return ResponseEntity
                .created(URI.create("/api/additional-works/" + saved.getId()))
                .body(body);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdditionalWorkDto> update(@PathVariable Long id,
                                                    @RequestBody AdditionalWorkDto dto) {

        var existingOpt = repo.findById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        var existing = existingOpt.get();
        dto.applyPatchToEntity(existing);

        var saved = repo.save(existing);
        var body = AdditionalWorkDto.fromEntity(saved);
        return ResponseEntity.ok(body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
