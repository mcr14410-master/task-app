package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.AdditionalWork;
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
    public List<AdditionalWork> list(@RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return activeOnly
                ? repo.findByActiveTrueOrderBySortOrderAscLabelAsc()
                : repo.findAllByOrderByActiveDescSortOrderAscLabelAsc();
    }

    @PostMapping
    public ResponseEntity<AdditionalWork> create(@RequestBody AdditionalWork w) {
        if (w.getCode() == null || w.getCode().isBlank()) return ResponseEntity.badRequest().build();
        if (w.getLabel() == null || w.getLabel().isBlank()) return ResponseEntity.badRequest().build();

        w.setId(null);
        if (w.getActive() == null) w.setActive(Boolean.TRUE);
        if (w.getSortOrder() == null) w.setSortOrder(0);

        var saved = repo.save(w);
        return ResponseEntity.created(URI.create("/api/additional-works/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdditionalWork> update(@PathVariable Long id, @RequestBody AdditionalWork w) {
        var existing = repo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();

        if (w.getCode() != null && !w.getCode().isBlank()) existing.setCode(w.getCode());
        if (w.getLabel() != null && !w.getLabel().isBlank()) existing.setLabel(w.getLabel());
        if (w.getType() != null) existing.setType(w.getType());
        if (w.getFlags() != null) existing.setFlags(w.getFlags());
        if (w.getActive() != null) existing.setActive(w.getActive());
        if (w.getSortOrder() != null) existing.setSortOrder(w.getSortOrder());
        if (w.getColorBg() != null) existing.setColorBg(w.getColorBg());
        if (w.getColorFg() != null) existing.setColorFg(w.getColorFg());
        if (w.getIsFinal() != null) existing.setIsFinal(w.getIsFinal());

        var saved = repo.save(existing);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
