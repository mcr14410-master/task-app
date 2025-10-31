package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.model.DueDateBucket;
import com.pp.taskmanagementbackend.service.DueDateSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * API: DueDate-Visual-Buckets (nur Visual – Planung/Arbeits-/Feiertage separat)
 *
 * GET  /api/settings/dueDate  -> aktuelle Buckets (aus DB, via Service; seedet Defaults falls leer)
 * PUT  /api/settings/dueDate  -> Buckets komplett ersetzen (Service validiert & erzwingt Fixed-Bereiche)
 *
 * Rückgabeformat kompatibel zu vorher:
 * {
 *   "buckets": [
 *     {"key":"overdue","label":"Überfällig","min":null,"max":-1,"color":"#ef4444","fixed":true,"role":"overdue"},
 *     ...
 *   ]
 * }
 */
@RestController
@RequestMapping("/api/settings")
public class DueDateSettingsController {

    private final DueDateSettingsService service;

    public DueDateSettingsController(DueDateSettingsService service) {
        this.service = service;
    }

    // ---- GET ----------------------------------------------------------------

    @GetMapping("/dueDate")
    public DueDateSettingsDto getDueDate() {
        List<DueDateBucket> all = service.getAllBuckets();
        // sortiert zurückgeben
        all.sort(Comparator.comparingInt(DueDateBucket::getSortOrder));
        return toDto(all);
    }

    // ---- PUT ----------------------------------------------------------------

    @PutMapping("/dueDate")
    public ResponseEntity<DueDateSettingsDto> putDueDate(@RequestBody DueDateSettingsDto incoming) {
        List<DueDateBucket> model = fromDto(incoming);
        List<DueDateBucket> saved = service.replaceAllBuckets(model);
        saved.sort(Comparator.comparingInt(DueDateBucket::getSortOrder));
        return ResponseEntity.ok(toDto(saved));
    }

    // ---- Mapping DTO <-> Entity --------------------------------------------

    private static DueDateSettingsDto toDto(List<DueDateBucket> list) {
        DueDateSettingsDto dto = new DueDateSettingsDto();
        List<DueBucketDto> items = new ArrayList<>();
        for (DueDateBucket b : list) {
            DueBucketDto d = new DueBucketDto();
            d.key = nvl(b.getKey());
            d.label = nvl(b.getLabel());
            d.min = b.getMinDays();
            d.max = b.getMaxDays();
            d.color = nvl(b.getColor());
            d.fixed = b.isFixed();
            d.role = nvl(b.getRole());
            d.sortOrder = b.getSortOrder();
            items.add(d);
        }
        dto.buckets = items;
        return dto;
    }

    private static List<DueDateBucket> fromDto(DueDateSettingsDto dto) {
        List<DueDateBucket> list = new ArrayList<>();
        if (dto != null && dto.buckets != null) {
            for (DueBucketDto b : dto.buckets) {
                if (b == null) continue;
                DueDateBucket e = new DueDateBucket();
                e.setKey(nvl(b.key));
                e.setLabel(nvl(b.label));
                e.setMinDays(b.min);
                e.setMaxDays(b.max);
                e.setColor(nvl(b.color));
                e.setRole(nvl(b.role));
                e.setFixed(Boolean.TRUE.equals(b.fixed));
                e.setSortOrder(b.sortOrder != null ? b.sortOrder : 0);
                list.add(e);
            }
        }
        return list;
    }

    private static String nvl(String s) { return s == null ? "" : s; }

    // ---- DTOs ----------------------------------------------------------------

    public static class DueDateSettingsDto {
        public List<DueBucketDto> buckets;
        public DueDateSettingsDto() {}
        public DueDateSettingsDto(List<DueBucketDto> buckets) { this.buckets = buckets; }
        public List<DueBucketDto> getBuckets() { return buckets; }
        public void setBuckets(List<DueBucketDto> buckets) { this.buckets = buckets; }
    }

    public static class DueBucketDto {
        public String key;
        public String label;
        public Integer min;       // inclusive; null = -∞
        public Integer max;       // inclusive; null = +∞
        public String color;
        public Boolean fixed;
        public String role;       // overdue|warn|ok
        public Integer sortOrder; // für stabile Anzeige

        public DueBucketDto() {}
        public DueBucketDto(String key, String label, Integer min, Integer max,
                            String color, Boolean fixed, String role, Integer sortOrder) {
            this.key = key; this.label = label; this.min = min; this.max = max;
            this.color = color; this.fixed = fixed; this.role = role; this.sortOrder = sortOrder;
        }
    }
}
