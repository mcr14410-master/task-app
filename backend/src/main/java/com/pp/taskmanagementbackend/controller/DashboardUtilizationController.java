package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.Arbeitsstation;
import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.ArbeitsstationRepository;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Aggregation-API für Dashboard-Visualisierungen (Balken/Heatmap).
 *
 * GET /api/dashboard/utilization?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * v0.8 Logik:
 * - Stunden werden am endDatum gebucht.
 * - Überfällige, noch nicht fertige Tasks (endDatum < from) werden als Carry-In
 *   auf den ersten sichtbaren Tag (from) gebucht.
 * - Fertige Tasks werden ausgeschlossen (Status "FERTIG"/"DONE" etc.).
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardUtilizationController {

    private final TaskRepository taskRepository;
    private final ArbeitsstationRepository stationRepository;

    public DashboardUtilizationController(TaskRepository taskRepository,
                                          ArbeitsstationRepository stationRepository) {
        this.taskRepository = taskRepository;
        this.stationRepository = stationRepository;
    }

    @GetMapping("/utilization")
    public ResponseEntity<List<StationUtilizationDto>> getUtilization(
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        // Default-Zeitraum: heute .. heute+6 (7 Tage)
        LocalDate today = LocalDate.now();
        if (from == null) from = today;
        if (to == null) to = today.plusDays(6);
        if (to.isBefore(from)) {
            LocalDate tmp = from;
            from = to;
            to = tmp;
        }

        // Tage im Bereich
        List<LocalDate> days = enumerateDays(from, to);

        // Kapazitäten je Station
        Map<String, BigDecimal> capacityByStation = stationRepository.findAll().stream()
                .collect(Collectors.toMap(
                        Arbeitsstation::getName,
                        st -> st.getDailyCapacityHours() != null ? st.getDailyCapacityHours() : new BigDecimal("8.00")
                ));

        // Alle Tasks (pragmatisch)
        List<Task> tasks = taskRepository.findAll();

        // station -> (date -> sum hours)
        Map<String, Map<LocalDate, Double>> sum = new HashMap<>();

        for (Task t : tasks) {
            if (isFinished(t)) continue; // fertige Tasks ignorieren

            LocalDate end = t.getEndDatum();
            if (end == null) continue; // ohne Datum derzeit nicht berücksichtigen

            // Nur Tasks mit endDatum <= to sind relevant (älter = überfällig)
            if (end.isAfter(to)) continue;

            // Carry-In: wenn endDatum < from, buche auf from
            LocalDate bookDay = end.isBefore(from) ? from : end;

            String station = normalizeStationName(t.getArbeitsstation());
            double hrs = safeHours(t.getAufwandStunden());
            if (hrs <= 0.0) continue;

            sum.computeIfAbsent(station, k -> new HashMap<>());
            Map<LocalDate, Double> perDay = sum.get(station);
            perDay.put(bookDay, perDay.getOrDefault(bookDay, 0.0) + hrs);
        }

        // Stationen ohne Einträge ergänzen (für stabile Heatmap)
        Set<String> allStationNames = new HashSet<>(capacityByStation.keySet());
        allStationNames.addAll(sum.keySet());

        List<StationUtilizationDto> out = new ArrayList<>();
        for (String station : allStationNames) {
            Map<LocalDate, Double> perDay = sum.getOrDefault(station, Collections.emptyMap());
            List<DayEntryDto> dayEntries = new ArrayList<>(days.size());
            for (LocalDate d : days) {
                dayEntries.add(new DayEntryDto(d.toString(), round2(perDay.getOrDefault(d, 0.0))));
            }
            BigDecimal cap = capacityByStation.getOrDefault(station, new BigDecimal("8.00"));
            out.add(new StationUtilizationDto(station, cap, dayEntries));
        }

        out.sort(Comparator.comparing(o -> o.station == null ? "" : o.station));
        return ResponseEntity.ok(out);
    }

    /* ---------------------- Helpers & DTOs ---------------------- */

    private static boolean isFinished(Task t) {
        String code = t.getStatusCode();
        if (code == null) return false;
        String c = code.trim().toUpperCase(Locale.ROOT);
        // robust: typische "fertig"-Codes
        return c.equals("FERTIG") || c.equals("DONE") || c.equals("COMPLETE") || c.equals("COMPLETED");
    }

    private static String normalizeStationName(String s) {
        return (s == null || s.isBlank()) ? "nicht zugeordnet" : s.trim();
    }

    private static double safeHours(Double v) {
        if (v == null) return 0.0;
        if (v.isNaN() || v.isInfinite()) return 0.0;
        return Math.max(0.0, v);
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private static List<LocalDate> enumerateDays(LocalDate from, LocalDate to) {
        List<LocalDate> result = new ArrayList<>();
        LocalDate d = from;
        while (!d.isAfter(to)) {
            result.add(d);
            d = d.plusDays(1);
        }
        return result;
    }

    public static class StationUtilizationDto {
        public String station;
        public BigDecimal dailyCapacityHours;
        public List<DayEntryDto> days;

        public StationUtilizationDto(String station, BigDecimal dailyCapacityHours, List<DayEntryDto> days) {
            this.station = station;
            this.dailyCapacityHours = dailyCapacityHours;
            this.days = days;
        }
    }

    public static class DayEntryDto {
        public String date;       // ISO-YYYY-MM-DD
        public double hoursPlanned;

        public DayEntryDto(String date, double hoursPlanned) {
            this.date = date;
            this.hoursPlanned = hoursPlanned;
        }
    }
}
