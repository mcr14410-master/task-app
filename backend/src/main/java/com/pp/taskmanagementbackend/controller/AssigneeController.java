package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.Assignee;
import com.pp.taskmanagementbackend.repository.AssigneeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/assignees")
public class AssigneeController {

    private final AssigneeRepository repo;

    public AssigneeController(AssigneeRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Assignee> list(@RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return activeOnly
                ? repo.findByActiveTrueOrderByNameAsc()
                : repo.findAllByOrderByActiveDescNameAsc();
    }

    @PostMapping
    public ResponseEntity<Assignee> create(@RequestBody Assignee a) {
        if (a.getName() == null || a.getName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        a.setId(null);
        if (a.getActive() == null) a.setActive(Boolean.TRUE);
        var saved = repo.save(a);
        return ResponseEntity.created(URI.create("/api/assignees/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Assignee> update(@PathVariable Long id, @RequestBody Assignee a) {
        var existing = repo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();

        if (a.getName() != null && !a.getName().isBlank()) existing.setName(a.getName());
        if (a.getEmail() != null) existing.setEmail(a.getEmail());
        if (a.getActive() != null) existing.setActive(a.getActive());

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
