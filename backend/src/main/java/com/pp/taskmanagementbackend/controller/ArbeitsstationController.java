package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.Arbeitsstation;
import com.pp.taskmanagementbackend.service.ArbeitsstationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/arbeitsstationen")
public class ArbeitsstationController {

    private final ArbeitsstationService arbeitsstationService;

    public ArbeitsstationController(ArbeitsstationService arbeitsstationService) {
        this.arbeitsstationService = arbeitsstationService;
    }

    // --- Alle Stationen abrufen ---
    @GetMapping
    public List<Arbeitsstation> getAllStations() {
        return arbeitsstationService.findAll();
    }

    // --- Station per ID abrufen ---
    @GetMapping("/{id}")
    public Arbeitsstation getStationById(@PathVariable Long id) {
        return arbeitsstationService.findById(id);
    }

    // --- Station per Name abrufen ---
    @GetMapping("/name/{name}")
    public Arbeitsstation getStationByName(@PathVariable String name) {
        return arbeitsstationService.findByName(name);
    }

    // --- Neue Station anlegen ---
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Arbeitsstation createStation(@RequestBody Arbeitsstation station) {
        return arbeitsstationService.save(station);
    }

    // --- Station aktualisieren ---
    @PutMapping("/{id}")
    public ResponseEntity<Arbeitsstation> updateStation(
            @PathVariable Long id,
            @RequestBody Arbeitsstation stationDetails) {

        Arbeitsstation existing = arbeitsstationService.findById(id);
        existing.setName(stationDetails.getName());
        existing.setSortOrder(stationDetails.getSortOrder());

        Arbeitsstation updated = arbeitsstationService.save(existing);
        return ResponseEntity.ok(updated);
    }

    // --- Station löschen per ID ---
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStationById(@PathVariable Long id) {
        arbeitsstationService.deleteById(id);
    }

    // --- Station löschen per Name ---
    @DeleteMapping("/name/{name}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStationByName(@PathVariable String name) {
        arbeitsstationService.deleteByName(name);
    }

    // --- Stationen-Reihenfolge speichern (Reorder) ---
    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorderStations(@RequestBody List<Arbeitsstation> stations) {
        arbeitsstationService.updateSortOrder(stations);
        return ResponseEntity.ok().build();
    }
}
