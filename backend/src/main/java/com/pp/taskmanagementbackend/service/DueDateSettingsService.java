package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.repository.DueDateBucketRepository;
import com.pp.taskmanagementbackend.model.DueDateBucket;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class DueDateSettingsService {

    private final DueDateBucketRepository repo;

    public DueDateSettingsService(DueDateBucketRepository repo) {
        this.repo = repo;
    }

    /** Lädt alle Buckets sortiert; seedet Defaults, falls DB leer ist. */
    public List<DueDateBucket> getAllBuckets() {
        List<DueDateBucket> list = repo.findAllByOrderBySortOrderAsc();
        if (list.isEmpty()) {
            list = defaults();
            repo.saveAll(list);
            list = repo.findAllByOrderBySortOrderAsc();
        }
        return list;
    }

    /** Ersetzt alle Buckets nach Validierung und Fixed-Enforcement. */
    @Transactional
    public List<DueDateBucket> replaceAllBuckets(List<DueDateBucket> incoming) {
        if (incoming == null) throw bad("Payload ungültig: buckets fehlt.");

        // defensive Kopie & Normalisierung
        List<DueDateBucket> copy = new ArrayList<>();
        for (DueDateBucket b : incoming) {
            if (b == null) continue;
            copy.add(new DueDateBucket(
                    safe(b.getKey()),
                    safe(b.getLabel()),
                    b.getMinDays(),
                    b.getMaxDays(),
                    safe(b.getColor()),
                    safe(b.getRole()),
                    b.isFixed(),
                    b.getSortOrder()
            ));
        }

        validate(copy);
        enforceFixedRanges(copy);

        // Sort-Order fallbacken (10er Schritte), falls 0 geliefert
        int order = 10;
        for (DueDateBucket b : copy) {
            if (b.getSortOrder() == 0) {
                b.setSortOrder(order);
                order += 10;
            }
        }

        repo.deleteAll();
        repo.saveAll(copy);
        return repo.findAllByOrderBySortOrderAsc();
    }

    /* -------------------- Validation & Enforcement -------------------- */

    private void validate(List<DueDateBucket> list) {
        if (list.isEmpty()) throw bad("Mindestens ein Bucket erforderlich.");

        // Keys: unique & regex
        Set<String> keys = new HashSet<>();
        for (DueDateBucket b : list) {
            if (isEmpty(b.getKey())) throw bad("Bucket key darf nicht leer sein.");
            if (!b.getKey().matches("^[a-z0-9-]+$")) {
                throw bad("Bucket key '" + b.getKey() + "' verletzt Regex ^[a-z0-9-]+$.");
            }
            if (!keys.add(b.getKey())) {
                throw bad("Bucket key '" + b.getKey() + "' ist nicht eindeutig.");
            }
            String role = isEmpty(b.getRole()) ? "ok" : b.getRole();
            if (!role.equals("overdue") && !role.equals("warn") && !role.equals("ok")) {
                throw bad("Bucket '" + b.getKey() + "': ungültige role '" + b.getRole() + "'. Erlaubt: overdue|warn|ok");
            }
        }

        // Pflicht-Buckets vorhanden?
        DueDateBucket overdue = find(list, "overdue");
        DueDateBucket today   = find(list, "today");
        if (overdue == null) throw bad("Pflicht-Bucket 'overdue' fehlt.");
        if (today == null)   throw bad("Pflicht-Bucket 'today' fehlt.");

        // fixe Bereiche prüfen
        if (!(overdue.getMinDays() == null && Objects.equals(overdue.getMaxDays(), -1))) {
            throw bad("Bucket 'overdue' hat festen Bereich: max=-1 (min leer).");
        }
        if (!(Objects.equals(today.getMinDays(), 0) && Objects.equals(today.getMaxDays(), 0))) {
            throw bad("Bucket 'today' hat festen Bereich: min=0,max=0.");
        }

        // Bereichs-Überschneidungen (inklusiv) verhindern
        List<Interval> ints = new ArrayList<>();
        for (DueDateBucket b : list) ints.add(new Interval(b.getKey(), b.getMinDays(), b.getMaxDays()));
        for (int i = 0; i < ints.size(); i++) {
            for (int j = i + 1; j < ints.size(); j++) {
                if (overlap(ints.get(i), ints.get(j))) {
                    throw bad("Bereichs-Überschneidung zwischen '" + ints.get(i).key + "' und '" + ints.get(j).key + "'.");
                }
            }
        }
    }

    private void enforceFixedRanges(List<DueDateBucket> list) {
        for (DueDateBucket b : list) {
            if ("overdue".equals(b.getKey())) {
                b.setFixed(true);
                b.setMinDays(null);   // offen nach unten
                b.setMaxDays(-1);     // < 0
                b.setRole("overdue");
            } else if ("today".equals(b.getKey())) {
                b.setFixed(true);
                b.setMinDays(0);
                b.setMaxDays(0);
                if (isEmpty(b.getRole())) b.setRole("warn");
            }
        }
    }

    private boolean overlap(Interval a, Interval b) {
        double alo = a.min == null ? Double.NEGATIVE_INFINITY : a.min.doubleValue();
        double ahi = a.max == null ? Double.POSITIVE_INFINITY : a.max.doubleValue();
        double blo = b.min == null ? Double.NEGATIVE_INFINITY : b.min.doubleValue();
        double bhi = b.max == null ? Double.POSITIVE_INFINITY : b.max.doubleValue();
        return !(ahi < blo || bhi < alo);
    }

    private DueDateBucket find(List<DueDateBucket> list, String key) {
        for (DueDateBucket b : list) if (key.equals(b.getKey())) return b;
        return null;
    }

    private static boolean isEmpty(String s) { return s == null || s.isBlank(); }
    private static String safe(String s) { return s == null ? "" : s; }
    private static ResponseStatusException bad(String msg) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg); }

    /* -------------------- Defaults -------------------- */

    private List<DueDateBucket> defaults() {
        List<DueDateBucket> l = new ArrayList<>();
        l.add(DueDateBucket.overdueDefault());
        l.add(DueDateBucket.todayDefault());
        l.add(new DueDateBucket("soon",   "Bald",    1, 3,    "#facc15", "warn", false, 30));
        l.add(new DueDateBucket("week",   "Woche",   4, 7,    "#0ea5e9", "ok",   false, 40));
        l.add(new DueDateBucket("future", "Zukunft", 8, null, "#94a3b8", "ok",   false, 50));
        return l;
    }

    private static class Interval {
        final String key; final Integer min; final Integer max;
        Interval(String key, Integer min, Integer max) { this.key = key; this.min = min; this.max = max; }
    }
}
