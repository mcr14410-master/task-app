package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.exception.StationNotFoundException;
import com.pp.taskmanagementbackend.model.Arbeitsstation;
import com.pp.taskmanagementbackend.repository.ArbeitsstationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.math.BigDecimal;
import java.math.RoundingMode;


@Service
public class ArbeitsstationService {

    private final ArbeitsstationRepository arbeitsstationRepository;
    

    public ArbeitsstationService(ArbeitsstationRepository arbeitsstationRepository) {
        this.arbeitsstationRepository = arbeitsstationRepository;
    }

    // --- Alle Stationen abrufen ---
    public List<Arbeitsstation> findAll() {
        return arbeitsstationRepository.findAll();
    }

    // --- Station per ID finden ---
    public Arbeitsstation findById(Long id) {
        return arbeitsstationRepository.findById(id)
                .orElseThrow(() -> new StationNotFoundException(id));
    }

    // --- Station per Name finden ---
    public Arbeitsstation findByName(String name) {
        return arbeitsstationRepository.findByName(name)
                .orElseThrow(() -> new StationNotFoundException(name, true));
    }

    // --- Neue/aktualisierte Station speichern ---
    @Transactional
    public Arbeitsstation save(Arbeitsstation station) {
        // Tageskapazität defensiv normalisieren (Default 8.00, clamp 0..24, 2 Nachkommastellen)
        station.setDailyCapacityHours(normalizeCapacity(station.getDailyCapacityHours()));
        return arbeitsstationRepository.save(station);
    }

    // --- Station löschen per ID ---
    @Transactional
    public void deleteById(Long id) {
        if (!arbeitsstationRepository.existsById(id)) {
            throw new StationNotFoundException(id);
        }
        arbeitsstationRepository.deleteById(id);
    }

    // --- Station löschen per Name ---
    @Transactional
    public void deleteByName(String name) {
        Arbeitsstation station = arbeitsstationRepository.findByName(name)
                .orElseThrow(() -> new StationNotFoundException(name, true));
        arbeitsstationRepository.delete(station);
    }

    // --- Reihenfolge mehrerer Stationen aktualisieren ---
    @Transactional
    public void updateSortOrder(List<Arbeitsstation> stations) {
        for (Arbeitsstation station : stations) {
            Arbeitsstation existing = arbeitsstationRepository.findById(station.getId())
                    .orElseThrow(() -> new StationNotFoundException(station.getId()));

            existing.setSortOrder(station.getSortOrder());
            existing.setName(station.getName()); // optional, falls Name auch geändert werden darf
            arbeitsstationRepository.save(existing);
        }
    }

    // --- Helper: Kapazität normalisieren ---
    private BigDecimal normalizeCapacity(BigDecimal cap) {
        if (cap == null) cap = new BigDecimal("8.00");
        if (cap.compareTo(BigDecimal.ZERO) < 0) cap = BigDecimal.ZERO;
        if (cap.compareTo(new BigDecimal("24.00")) > 0) cap = new BigDecimal("24.00");
        return cap.setScale(2, RoundingMode.HALF_UP);
    }
}
