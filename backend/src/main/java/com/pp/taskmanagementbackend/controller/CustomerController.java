package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.Customer;
import com.pp.taskmanagementbackend.repository.CustomerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerRepository repo;

    public CustomerController(CustomerRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Customer> list(@RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return activeOnly
                ? repo.findByActiveTrueOrderByNameAsc()
                : repo.findAllByOrderByActiveDescNameAsc();
    }

    @PostMapping
    public ResponseEntity<Customer> create(@RequestBody Customer c) {
        if (c.getName() == null || c.getName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        c.setId(null);
        if (c.getActive() == null) c.setActive(Boolean.TRUE);
        var saved = repo.save(c);
        return ResponseEntity.created(URI.create("/api/customers/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Customer> update(@PathVariable Long id, @RequestBody Customer c) {
        var existing = repo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();

        if (c.getName() != null && !c.getName().isBlank()) existing.setName(c.getName());
        if (c.getActive() != null) existing.setActive(c.getActive());

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
