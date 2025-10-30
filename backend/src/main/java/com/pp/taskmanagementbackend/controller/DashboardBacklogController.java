package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * /api/dashboard/backlog
 * Rückstandsliste für Druck/CSV:
 *  - zeigt alle NICHT FERTIGEN Tasks, deren endDatum <= to liegt
 *  - optional: Tasks ohne Datum, wenn includeNoDate=true
 *  - optional: Filter nach Station
 *
 * GET /api/dashboard/backlog?from=YYYY-MM-DD&to=YYYY-MM-DD&station=Grob%20G350&includeNoDate=false
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardBacklogController {

    private final TaskRepository taskRepository;

    public DashboardBacklogController(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @GetMapping("/backlog")
    public ResponseEntity<List<TaskBacklogDto>> getBacklog(
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "station", required = false) String station,
            @RequestParam(value = "includeNoDate", defaultValue = "false") boolean includeNoDate
    ) {
        LocalDate today = LocalDate.now();
        if (from == null) from = today.minusDays(14);
        if (to == null) to = today.plusDays(30);
        if (to.isBefore(from)) {
            LocalDate tmp = from; from = to; to = tmp;
        }

        // Für Lambdas: final Kopien
        final LocalDate toF = to;
        final String stationFilter = (station == null) ? null : station.trim();
        final boolean includeNoDateF = includeNoDate;

        // Alle Tasks (v0.8 pragmatisch)
        List<Task> all = taskRepository.findAll();

        // Filterlogik:
        // - exclude FINISHED
        // - if end==null -> nur bei includeNoDate
        // - sonst end <= to
        List<Task> filtered = all.stream()
                .filter(t -> !isFinished(t))
                .filter(t -> {
                    if (stationFilter != null && !stationFilter.isBlank()) {
                        String s = normalizeStation(t.getArbeitsstation());
                        if (!s.equalsIgnoreCase(stationFilter)) return false;
                    }
                    LocalDate end = t.getEndDatum();
                    if (end == null) return includeNoDateF;
                    return !end.isAfter(toF); // <= to
                })
                .collect(Collectors.toList());

        // DTOs + Sortierung (station, datum asc, bezeichnung)
        List<TaskBacklogDto> dtos = filtered.stream()
                .map(DashboardBacklogController::toDto)
                .sorted(Comparator
                        .comparing(TaskBacklogDto::getStation, Comparator.nullsLast(String::compareToIgnoreCase))
                        .thenComparing(TaskBacklogDto::getEndDatum, Comparator.nullsLast(LocalDate::compareTo))
                        .thenComparing(TaskBacklogDto::getBezeichnung, Comparator.nullsLast(String::compareToIgnoreCase)))
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /* ---------------------------- Helpers ---------------------------- */

    private static boolean isFinished(Task t) {
        String code = t.getStatusCode();
        if (code == null) return false;
        String c = code.trim().toUpperCase(Locale.ROOT);
        return c.equals("FERTIG") || c.equals("DONE") || c.equals("COMPLETE") || c.equals("COMPLETED");
    }

    private static String normalizeStation(String s) {
        return (s == null || s.isBlank()) ? "nicht zugeordnet" : s.trim();
    }

    private static String safe(String s) {
        return (s == null) ? "" : s;
    }

    private static String extractAdditionalWorks(Task t) {
        // Robust gegen unterschiedliche Feldnamen/Refactors
        try {
            Method m = t.getClass().getMethod("getAdditionalWorks");
            Object val = m.invoke(t);
            if (val instanceof Collection<?>) {
                Collection<?> col = (Collection<?>) val;
                return col.stream().map(String::valueOf).collect(Collectors.joining(", "));
            }
        } catch (ReflectiveOperationException ignore) { }
        return "";
    }

    private static TaskBacklogDto toDto(Task t) {
        return new TaskBacklogDto(
                normalizeStation(t.getArbeitsstation()),
                safe(t.getBezeichnung()),
                safe(t.getKunde()),
                safe(t.getTeilenummer()),
                t.getEndDatum(),
                safe(t.getStatusCode()),
                t.getAufwandStunden() != null ? t.getAufwandStunden() : 0.0,
                extractAdditionalWorks(t)
        );
    }

    /* ----------------------------- DTO ------------------------------ */

    public static class TaskBacklogDto {
        private String station;
        private String bezeichnung;
        private String kunde;
        private String teilenummer;
        private LocalDate endDatum;
        private String statusCode;
        private double aufwandStunden;
        private String zusatzarbeiten;

        public TaskBacklogDto(String station, String bezeichnung, String kunde, String teilenummer,
                              LocalDate endDatum, String statusCode,
                              double aufwandStunden, String zusatzarbeiten) {
            this.station = station;
            this.bezeichnung = bezeichnung;
            this.kunde = kunde;
            this.teilenummer = teilenummer;
            this.endDatum = endDatum;
            this.statusCode = statusCode;
            this.aufwandStunden = aufwandStunden;
            this.zusatzarbeiten = zusatzarbeiten;
        }

        public String getStation() { return station; }
        public String getBezeichnung() { return bezeichnung; }
        public String getKunde() { return kunde; }
        public String getTeilenummer() { return teilenummer; }
        public LocalDate getEndDatum() { return endDatum; }
        public String getStatusCode() { return statusCode; }
        public double getAufwandStunden() { return aufwandStunden; }
        public String getZusatzarbeiten() { return zusatzarbeiten; }
    }
}
