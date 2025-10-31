package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.TaskRepository;
import com.pp.taskmanagementbackend.repository.TaskStatusRepository;
import com.pp.taskmanagementbackend.repository.AdditionalWorkRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * /api/dashboard/backlog
 * Rückstandsliste:
 *  - alle NICHT FERTIGEN Tasks mit endDatum <= to
 *  - optional: Tasks ohne Datum (includeNoDate=true)
 *  - optional: Filter nach Station
 *  - liefert: statusLabel, zusatzarbeiten (Labels), stueckzahl
 *
 * Robust gegenüber unterschiedlichen Getter-Namen/Typen (Reflexion).
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardBacklogController {

    private final TaskRepository taskRepository;
    private final TaskStatusRepository taskStatusRepository;
    private final AdditionalWorkRepository additionalWorkRepository;

    public DashboardBacklogController(TaskRepository taskRepository,
                                      TaskStatusRepository taskStatusRepository,
                                      AdditionalWorkRepository additionalWorkRepository) {
        this.taskRepository = taskRepository;
        this.taskStatusRepository = taskStatusRepository;
        this.additionalWorkRepository = additionalWorkRepository;
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
        if (to.isBefore(from)) { LocalDate tmp = from; from = to; to = tmp; }

        final LocalDate toF = to;
        final String stationFilter = (station == null) ? null : station.trim();
        final boolean includeNoDateF = includeNoDate;

        // --- Lookups (robust, per Reflexion) ------------------------------------
        final Map<String, String> statusLabelByCode = buildCodeToLabelMap(
                taskStatusRepository.findAll(),
                new String[]{"getCode", "getStatusCode", "getId"},
                new String[]{"getBezeichnung", "getName", "getLabel", "getDisplayName", "getBeschreibung"}
        );

        final Map<String, String> addWorkLabelByCode = buildCodeToLabelMap(
                additionalWorkRepository.findAll(),
                new String[]{"getCode", "getId"},
                new String[]{"getBezeichnung", "getName", "getLabel", "getDisplayName", "getBeschreibung"}
        );

        // --- Tasks laden & filtern ----------------------------------------------
        List<Task> filtered = taskRepository.findAll().stream()
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

        // --- DTOs bilden & sortieren --------------------------------------------
        List<TaskBacklogDto> dtos = filtered.stream()
                .map(t -> toDto(t, statusLabelByCode, addWorkLabelByCode))
                .sorted(Comparator
                        .comparing(TaskBacklogDto::getStation, Comparator.nullsLast(String::compareToIgnoreCase))
                        .thenComparing(TaskBacklogDto::getEndDatum, Comparator.nullsLast(LocalDate::compareTo))
                        .thenComparing(TaskBacklogDto::getBezeichnung, Comparator.nullsLast(String::compareToIgnoreCase)))
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /* ============================ Helpers ============================ */

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

    private static String nullSafeUpper(String s) {
        return (s == null) ? "" : s.trim().toUpperCase(Locale.ROOT);
    }

    /**
     * Baut eine Map<code,label> aus einer beliebigen Liste (Status, Zusatzarbeiten).
     * Getter-Namen werden per Reflexion versucht.
     */
    private static Map<String, String> buildCodeToLabelMap(List<?> list, String[] codeGetters, String[] labelGetters) {
        Map<String, String> map = new HashMap<>();
        if (list == null) return map;
        for (Object o : list) {
            if (o == null) continue;
            String code = readString(o, codeGetters);
            if (code == null || code.isBlank()) continue;
            String label = readString(o, labelGetters);
            map.put(nullSafeUpper(code), (label == null || label.isBlank()) ? code : label);
        }
        return map;
    }

    /**
     * Liest den ersten nicht-leeren String aus den angegebenen Getter-Namen.
     */
    private static String readString(Object target, String... getterNames) {
        if (target == null || getterNames == null) return null;
        for (String name : getterNames) {
            try {
                Method m = target.getClass().getMethod(name);
                Object v = m.invoke(target);
                if (v != null) {
                    String s = String.valueOf(v).trim();
                    if (!s.isEmpty()) return s;
                }
            } catch (ReflectiveOperationException ignore) {}
        }
        return null;
    }

    private static Integer extractStueckzahl(Task t) {
        for (String mName : new String[]{
                "getStk", "getStueckzahl", "getMenge", "getQuantity", "getStueck"
        }) {
            try {
                Method m = t.getClass().getMethod(mName);
                Object val = m.invoke(t);
                if (val instanceof Number) {
                    int n = ((Number) val).intValue();
                    if (n >= 0) return n;
                }
            } catch (ReflectiveOperationException ignore) {}
        }
        return null;
    }

    private static String buildStatusLabel(Task t, Map<String, String> statusLabelByCode) {
        String direct = readString(t, "getStatusLabel", "getStatusName", "getStatusBezeichnung");
        if (direct != null && !direct.isBlank()) return direct;
        String code = nullSafeUpper(t.getStatusCode());
        String lbl = statusLabelByCode.get(code);
        return (lbl != null && !lbl.isBlank()) ? lbl : safe(t.getStatusCode());
    }

    /** Ein einzelnes AdditionalWork-Element (Entity oder String) in Label auflösen. */
    private static String resolveAwLabel(Object x, Map<String, String> addWorkLabelByCode) {
        if (x == null) return null;

        // 1) Label-Getter auf Entität versuchen
        String lbl = readString(x, "getBezeichnung", "getName", "getLabel", "getDisplayName", "getBeschreibung");
        if (lbl != null && !lbl.isBlank()) return lbl;

        // 2) Code an der Entität lesen -> Map
        String code = readString(x, "getCode", "getId");
        if (code != null && !code.isBlank()) {
            String mapped = addWorkLabelByCode.get(nullSafeUpper(code));
            if (mapped != null && !mapped.isBlank()) return mapped;
            return code;
        }

        // 3) Fallback: toString() und gegen Map prüfen
        String s = String.valueOf(x).trim();
        if (!s.isEmpty()) {
            String mapped = addWorkLabelByCode.get(nullSafeUpper(s));
            return (mapped != null && !mapped.isBlank()) ? mapped : s;
        }
        return null;
    }

    /**
     * Zusatzarbeiten als Labels bauen.
     * Unterstützt:
     *  - Collection von Entities/Strings
     *  - Komma-/Semikolon-String
     *  - JSON-ähnliche Arrays wie ["fai","qs"]
     */
    private static String buildAdditionalWorksLabel(Task t, Map<String, String> addWorkLabelByCode) {
        // 1) Versuche Collection-getter per Reflexion
        for (String mName : new String[]{
                "getAdditionalWorks", "getZusatzarbeiten", "getAdditionalWorkObjects", "getAdditionalWorkList"
        }) {
            try {
                Method m = t.getClass().getMethod(mName);
                Object val = m.invoke(t);
                if (val instanceof Collection<?>) {
                    Collection<?> col = (Collection<?>) val;
                    if (!col.isEmpty()) {
                        return col.stream()
                                .map(x -> resolveAwLabel(x, addWorkLabelByCode))
                                .filter(s -> s != null && !s.isBlank())
                                .collect(Collectors.joining(", "));
                    }
                } else if (val instanceof String) {
                    List<String> tokens = parseListishString((String) val);
                    return tokens.stream()
                            .map(it -> {
                                String mapped = addWorkLabelByCode.get(nullSafeUpper(it));
                                return (mapped != null && !mapped.isBlank()) ? mapped : it;
                            })
                            .collect(Collectors.joining(", "));
                }
            } catch (ReflectiveOperationException ignore) {}
        }

        // 2) Alternative reine String-Getter (bereits gelabelt oder kommagetrennt)
        for (String mName : new String[]{ "getAdditionalWorkLabels", "getAdditionalWorkCodes" }) {
            try {
                Method m = t.getClass().getMethod(mName);
                Object val = m.invoke(t);
                if (val instanceof String) {
                    List<String> tokens = parseListishString((String) val);
                    return tokens.stream()
                            .map(it -> {
                                String mapped = addWorkLabelByCode.get(nullSafeUpper(it));
                                return (mapped != null && !mapped.isBlank()) ? mapped : it;
                            })
                            .collect(Collectors.joining(", "));
                } else if (val instanceof Collection<?>) {
                    Collection<?> col = (Collection<?>) val;
                    if (!col.isEmpty()) {
                        return col.stream()
                                .map(x -> {
                                    String s = (x == null) ? "" : String.valueOf(x).trim();
                                    String mapped = addWorkLabelByCode.get(nullSafeUpper(s));
                                    return (mapped != null && !mapped.isBlank()) ? mapped : s;
                                })
                                .filter(s -> !s.isBlank())
                                .collect(Collectors.joining(", "));
                    }
                }
            } catch (ReflectiveOperationException ignore) {}
        }

        return "";
    }

    /** Zerlegt JSON-ähnliche Arrays (["fai","qs"]) ODER Komma-/Semikolon-Strings in Tokens ohne Quotes/Klammern. */
    private static List<String> parseListishString(String raw) {
        if (raw == null) return Collections.emptyList();
        String s = raw.trim();
        if (s.startsWith("[") && s.endsWith("]")) {
            s = s.substring(1, s.length() - 1); // Klammern ab
        }
        if (s.isEmpty()) return Collections.emptyList();
        String[] parts = s.split("[,;]");
        List<String> out = new ArrayList<>(parts.length);
        for (String p : parts) {
            String t = p.trim();
            if ((t.startsWith("\"") && t.endsWith("\"")) || (t.startsWith("'") && t.endsWith("'"))) {
                t = t.substring(1, t.length() - 1).trim();
            }
            if (!t.isEmpty()) out.add(t);
        }
        return out;
    }

    private static TaskBacklogDto toDto(Task t,
                                        Map<String, String> statusLabelByCode,
                                        Map<String, String> addWorkLabelByCode) {
        return new TaskBacklogDto(
                normalizeStation(t.getArbeitsstation()),
                safe(t.getBezeichnung()),
                safe(t.getKunde()),
                safe(t.getTeilenummer()),
                t.getEndDatum(),
                safe(t.getStatusCode()),
                buildStatusLabel(t, statusLabelByCode),
                t.getAufwandStunden() != null ? t.getAufwandStunden() : 0.0,
                buildAdditionalWorksLabel(t, addWorkLabelByCode),
                extractStueckzahl(t)
        );
    }

    /* ============================== DTO ============================== */

    public static class TaskBacklogDto {
        private String station;
        private String bezeichnung;
        private String kunde;
        private String teilenummer;
        private LocalDate endDatum;
        private String statusCode;
        private String statusLabel;     // Bezeichnung
        private double aufwandStunden;
        private String zusatzarbeiten;  // kommagetrennte Labels
        private Integer stueckzahl;     // Stk.

        public TaskBacklogDto(String station, String bezeichnung, String kunde, String teilenummer,
                              LocalDate endDatum, String statusCode, String statusLabel,
                              double aufwandStunden, String zusatzarbeiten, Integer stueckzahl) {
            this.station = station;
            this.bezeichnung = bezeichnung;
            this.kunde = kunde;
            this.teilenummer = teilenummer;
            this.endDatum = endDatum;
            this.statusCode = statusCode;
            this.statusLabel = statusLabel;
            this.aufwandStunden = aufwandStunden;
            this.zusatzarbeiten = zusatzarbeiten;
            this.stueckzahl = stueckzahl;
        }

        public String getStation() { return station; }
        public String getBezeichnung() { return bezeichnung; }
        public String getKunde() { return kunde; }
        public String getTeilenummer() { return teilenummer; }
        public LocalDate getEndDatum() { return endDatum; }
        public String getStatusCode() { return statusCode; }
        public String getStatusLabel() { return statusLabel; }
        public double getAufwandStunden() { return aufwandStunden; }
        public String getZusatzarbeiten() { return zusatzarbeiten; }
        public Integer getStueckzahl() { return stueckzahl; }
    }
}
