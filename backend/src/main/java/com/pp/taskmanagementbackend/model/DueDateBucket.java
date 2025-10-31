package com.pp.taskmanagementbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Objects;

/**
 * Persistente Definition eines Fälligkeits-Buckets (visuelle Einfärbung).
 * Entspricht der Flyway-Tabelle "due_date_bucket".
 *
 * WICHTIG:
 * - "overdue" und "today" sind System-Buckets (fixed = true) mit festen Bereichen:
 *      overdue:  minDays = NULL, maxDays = -1   (=> < 0)
 *      today:    minDays = 0,    maxDays = 0    (=> = 0)
 * - Alle anderen Buckets sind frei konfigurierbar.
 *
 * Die Interpretation der Bereiche (diffDays in Tagen) passiert server- oder clientseitig.
 * Diese Entity dient ausschließlich der Speicherung/Konfiguration.
 */
@Entity
@Table(name = "due_date_bucket")
public class DueDateBucket {

    @Id
    @Column(name = "key", length = 64, nullable = false)
    private String key;              // z. B. "overdue", "today", "custom-1"

    @Column(name = "label", length = 128, nullable = false)
    private String label;            // Anzeigename

    @Column(name = "min_days")
    private Integer minDays;         // inklusiv; NULL = -∞

    @Column(name = "max_days")
    private Integer maxDays;         // inklusiv; NULL = +∞

    @Column(name = "color", length = 32, nullable = false)
    private String color;            // z. B. "#ef4444" oder "rgb(239,68,68)"

    @Column(name = "role", length = 16, nullable = false)
    private String role;             // "overdue" | "warn" | "ok" (nur visuelle Gruppierung)

    @Column(name = "fixed", nullable = false)
    private boolean fixed;           // System-Buckets (overdue/today) = true

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;           // Reihenfolge in der UI

    public DueDateBucket() {
    }

    public DueDateBucket(String key, String label, Integer minDays, Integer maxDays,
                         String color, String role, boolean fixed, int sortOrder) {
        this.key = key;
        this.label = label;
        this.minDays = minDays;
        this.maxDays = maxDays;
        this.color = color;
        this.role = role;
        this.fixed = fixed;
        this.sortOrder = sortOrder;
    }

    // --- Getter/Setter ---

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public Integer getMinDays() {
        return minDays;
    }

    public void setMinDays(Integer minDays) {
        this.minDays = minDays;
    }

    public Integer getMaxDays() {
        return maxDays;
    }

    public void setMaxDays(Integer maxDays) {
        this.maxDays = maxDays;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getRole() {
        return role;
    }

    /**
     * Erwartete Werte: "overdue", "warn", "ok".
     * (Datenkonsistenz zusätzlich per DB-Check-Constraint abgesichert.)
     */
    public void setRole(String role) {
        this.role = role;
    }

    public boolean isFixed() {
        return fixed;
    }

    public void setFixed(boolean fixed) {
        this.fixed = fixed;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    // --- equals/hashCode nur über Primärschlüssel ---

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DueDateBucket)) return false;
        DueDateBucket that = (DueDateBucket) o;
        return Objects.equals(key, that.key);
    }

    @Override
    public int hashCode() {
        return key != null ? key.hashCode() : 0;
    }

    // --- bequeme Factory-Methoden (optional) ---

    public static DueDateBucket overdueDefault() {
        return new DueDateBucket("overdue", "Überfällig", null, -1, "#ef4444", "overdue", true, 10);
        // Bereich ist fest (<0)
    }

    public static DueDateBucket todayDefault() {
        return new DueDateBucket("today", "Heute", 0, 0, "#f5560a", "warn", true, 20);
        // Bereich ist fest (=0)
    }
}
