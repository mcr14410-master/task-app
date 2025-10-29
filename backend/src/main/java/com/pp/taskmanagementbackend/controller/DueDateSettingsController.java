package com.pp.taskmanagementbackend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

/**
 * API: DueDate-Visual-Buckets (nur Visual! – Planning bleibt separat)
 *
 * GET  /api/settings/dueDate  -> aktuelle Buckets
 * PUT  /api/settings/dueDate  -> Buckets ersetzen (with validation)
 *
 * Aktuell: In-Memory-Persistenz (AtomicReference). Beim Neustart weg.
 * Später: DB/Config-Storage in separatem Schritt.
 */
@RestController
@RequestMapping("/api/settings")
public class DueDateSettingsController {

    private static final AtomicReference<DueDateSettings> STATE =
            new AtomicReference<>(defaults());

    // ---- GET ----------------------------------------------------------------

    @GetMapping("/dueDate")
    public DueDateSettings getDueDate() {
        return STATE.get();
    }

    // ---- PUT ----------------------------------------------------------------

    @PutMapping("/dueDate")
    public ResponseEntity<DueDateSettings> putDueDate(@RequestBody DueDateSettings incoming) {
        // sanitize null
        if (incoming == null || incoming.getBuckets() == null) {
            throw bad("Payload ungültig: buckets fehlt.");
        }

        // defensive copy
        List<DueBucket> copy = new ArrayList<>();
        for (DueBucket b : incoming.getBuckets()) {
            if (b == null) continue;
            copy.add(new DueBucket(
                    nvl(b.getKey()),
                    nvl(b.getLabel()),
                    b.getMin(),
                    b.getMax(),
                    nvl(b.getColor()),
                    b.getFixed(),
                    nvl(b.getRole())
            ));
        }
        DueDateSettings normalized = new DueDateSettings(copy);

        // Validierung
        validate(normalized);

        // Fix-Buckets erzwingen (Bereiche sind nicht änderbar)
        enforceFixedRanges(normalized);

        STATE.set(normalized);
        return ResponseEntity.ok(STATE.get());
    }

    // ---- Validation ----------------------------------------------------------

    private static void validate(DueDateSettings cfg) {
        List<DueBucket> list = cfg.getBuckets();
        if (list.isEmpty()) throw bad("Mindestens ein Bucket erforderlich.");

        // Keys: unique & regex
        Set<String> keys = new HashSet<>();
        for (DueBucket b : list) {
            if (empty(b.key)) throw bad("Bucket key darf nicht leer sein.");
            if (!b.key.matches("^[a-z0-9-]+$")) {
                throw bad("Bucket key '" + b.key + "' verletzt Regex ^[a-z0-9-]+$.");
            }
            if (!keys.add(b.key)) {
                throw bad("Bucket key '" + b.key + "' ist nicht eindeutig.");
            }
        }

        // Pflicht-Buckets vorhanden?
        DueBucket overdue = find(list, "overdue");
        DueBucket today   = find(list, "today");
        if (overdue == null) throw bad("Pflicht-Bucket 'overdue' fehlt.");
        if (today == null)   throw bad("Pflicht-Bucket 'today' fehlt.");

        // Rollen prüfen
        for (DueBucket b : list) {
            String role = empty(b.role) ? "ok" : b.role;
            if (!role.equals("overdue") && !role.equals("warn") && !role.equals("ok")) {
                throw bad("Bucket '" + b.key + "': ungültige role '" + b.role + "'. Erlaubt: overdue|warn|ok");
            }
        }

        // Bereiche prüfen (inclusive-overlap)
        List<Interval> intervals = new ArrayList<>();
        for (DueBucket b : list) {
            intervals.add(new Interval(b.key, b.min, b.max));
        }

        // Overlaps
        for (int i = 0; i < intervals.size(); i++) {
            for (int j = i + 1; j < intervals.size(); j++) {
                if (overlap(intervals.get(i), intervals.get(j))) {
                    throw bad("Bereichs-Überschneidung zwischen '" + intervals.get(i).key + "' und '" + intervals.get(j).key + "'.");
                }
            }
        }

        // Fixe Bereiche NICHT änderbar (nur Farbe)
        if (!(overdue.min == null && Objects.equals(overdue.max, -1))) {
            throw bad("Bucket 'overdue' hat festen Bereich: max=-1 (min leer).");
        }
        if (!(Objects.equals(today.min, 0) && Objects.equals(today.max, 0))) {
            throw bad("Bucket 'today' hat festen Bereich: min=0,max=0.");
        }
    }

    private static void enforceFixedRanges(DueDateSettings cfg) {
        for (DueBucket b : cfg.getBuckets()) {
            if ("overdue".equals(b.key)) {
                b.fixed = true;
                b.min = null;   // offen nach unten
                b.max = -1;     // < 0
                b.role = "overdue";
            } else if ("today".equals(b.key)) {
                b.fixed = true;
                b.min = 0;
                b.max = 0;
                // today ist visuell "warn"
                if (empty(b.role)) b.role = "warn";
            }
        }
    }

    // ---- Defaults ------------------------------------------------------------

    private static DueDateSettings defaults() {
        List<DueBucket> list = new ArrayList<>();
        list.add(new DueBucket("overdue", "Überfällig", null, -1, "#ef4444", true, "overdue"));
        list.add(new DueBucket("today",   "Heute",       0,    0,  "#f5560a", true, "warn"));
        list.add(new DueBucket("soon",    "Bald",        1,    3,  "#facc15", false, "warn"));
        list.add(new DueBucket("week",    "Woche",       4,    7,  "#0ea5e9", false, "ok"));
        list.add(new DueBucket("future",  "Zukunft",     8,    null, "#94a3b8", false, "ok"));
        return new DueDateSettings(list);
    }

    // ---- Helpers -------------------------------------------------------------

    private static boolean overlap(Interval a, Interval b) {
        double alo = a.min == null ? Double.NEGATIVE_INFINITY : a.min.doubleValue();
        double ahi = a.max == null ? Double.POSITIVE_INFINITY : a.max.doubleValue();
        double blo = b.min == null ? Double.NEGATIVE_INFINITY : b.min.doubleValue();
        double bhi = b.max == null ? Double.POSITIVE_INFINITY : b.max.doubleValue();
        // inclusive overlap:
        return !(ahi < blo || bhi < alo);
    }

    private static DueBucket find(List<DueBucket> list, String key) {
        for (DueBucket b : list) if (key.equals(b.key)) return b;
        return null;
    }

    private static boolean empty(String s) { return s == null || s.isBlank(); }
    private static String nvl(String s) { return s == null ? "" : s; }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }

    // ---- Model ----------------------------------------------------------------

    public static class DueDateSettings {
        private List<DueBucket> buckets;

        public DueDateSettings() {}
        public DueDateSettings(List<DueBucket> buckets) { this.buckets = buckets; }

        public List<DueBucket> getBuckets() { return buckets; }
        public void setBuckets(List<DueBucket> buckets) { this.buckets = buckets; }
    }

    public static class DueBucket {
        private String key;
        private String label;
        private Integer min;   // inclusive; null = -∞
        private Integer max;   // inclusive; null = +∞
        private String color;  // hex oder css
        private Boolean fixed; // overdue/today = true
        private String role;   // overdue|warn|ok

        public DueBucket() {}

        public DueBucket(String key, String label, Integer min, Integer max,
                         String color, Boolean fixed, String role) {
            this.key = key;
            this.label = label;
            this.min = min;
            this.max = max;
            this.color = color;
            this.fixed = fixed;
            this.role = role;
        }

        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }

        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }

        public Integer getMin() { return min; }
        public void setMin(Integer min) { this.min = min; }

        public Integer getMax() { return max; }
        public void setMax(Integer max) { this.max = max; }

        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }

        public Boolean getFixed() { return fixed; }
        public void setFixed(Boolean fixed) { this.fixed = fixed; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }

    // internes Intervall für Überschneidungsprüfung
    private static class Interval {
        final String key;
        final Integer min;
        final Integer max;
        Interval(String key, Integer min, Integer max) {
            this.key = key;
            this.min = min;
            this.max = max;
        }
    }
}
