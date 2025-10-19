package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.model.TaskStatusEntity;
import com.pp.taskmanagementbackend.repository.TaskStatusRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class TaskStatusService {

    private final TaskStatusRepository repository;

    public TaskStatusService(TaskStatusRepository repository) {
        this.repository = repository;
    }

    // -----------------------
    // READ
    // -----------------------

    /** Liefert alle aktiven Status sortiert (sort_order, label). */
    public List<TaskStatusEntity> listActive() {
        return repository.findAllByActiveTrueOrderBySortOrderAscLabelAsc();
    }

    /** Liefert alle Status (inkl. inaktive), sortiert. */
    public List<TaskStatusEntity> listAll() {
        return repository.findAllByOrderBySortOrderAscLabelAsc();
    }

    /** Einzelnen Status per Code suchen (Optional). */
    public Optional<TaskStatusEntity> findByCode(String code) {
        return repository.findByCode(code);
    }

    // -----------------------
    // WRITE (für kommende Controller-Endpunkte)
    // -----------------------

    private static final String HEX = "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$";

    private void validate(TaskStatusEntity e, boolean isCreate) {
        if (e.getCode() == null || e.getCode().isBlank())
            throw new IllegalArgumentException("code required");
        if (e.getLabel() == null || e.getLabel().isBlank())
            throw new IllegalArgumentException("label required");
        if (e.getColorBg() == null || !e.getColorBg().matches(HEX))
            throw new IllegalArgumentException("colorBg must be hex like #RRGGBB");
        if (e.getColorFg() == null || !e.getColorFg().matches(HEX))
            throw new IllegalArgumentException("colorFg must be hex like #RRGGBB");
        if (isCreate && repository.existsByCode(e.getCode()))
            throw new IllegalArgumentException("code already exists");
        if (e.getSortOrder() == null) e.setSortOrder(0);
    }

    /** Neuen Status anlegen. */
    @Transactional
    public TaskStatusEntity create(TaskStatusEntity in) {
        // Trimmen/Normalisieren
        var e = new TaskStatusEntity();
        e.setCode(in.getCode().trim());
        e.setLabel(in.getLabel().trim());
        e.setColorBg(in.getColorBg().trim());
        e.setColorFg(in.getColorFg().trim());
        e.setSortOrder(in.getSortOrder() == null ? 0 : in.getSortOrder());
        e.setFinal(in.isFinal());
        e.setActive(in.isActive());

        validate(e, true);
        return repository.save(e);
    }

    /**
     * Status updaten. Unterstützt optional Code-Umbenennung.
     * Achtung: FK ist ON UPDATE CASCADE (per Migration), daher sicher.
     */
    @Transactional
    public TaskStatusEntity update(String currentCode, TaskStatusEntity in) {
        var e = repository.findByCode(currentCode)
                .orElseThrow(() -> new IllegalArgumentException("Status not found: " + currentCode));

        // Wenn Code geändert werden soll:
        if (in.getCode() != null && !in.getCode().equals(currentCode)) {
            var newCode = in.getCode().trim();
            if (repository.existsByCode(newCode)) {
                throw new IllegalArgumentException("New code already exists: " + newCode);
            }
            e.setCode(newCode);
        }

        if (in.getLabel() != null) e.setLabel(in.getLabel().trim());
        if (in.getColorBg() != null) e.setColorBg(in.getColorBg().trim());
        if (in.getColorFg() != null) e.setColorFg(in.getColorFg().trim());
        if (in.getSortOrder() != null) e.setSortOrder(in.getSortOrder());
        // Flags
        e.setFinal(in.isFinal());
        e.setActive(in.isActive());

        validate(e, false);
        return repository.save(e);
    }

    /**
     * "Löschen" als Soft-Delete (active=false).
     * Hard-Delete könnte referenzierende Tasks verletzen; daher hier bewusst soft.
     */
    @Transactional
    public void softDelete(String code) {
        var e = repository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Status not found: " + code));
        e.setActive(false);
        repository.save(e);
    }
}
