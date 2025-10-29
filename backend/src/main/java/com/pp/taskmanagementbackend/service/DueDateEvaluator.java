package com.pp.taskmanagementbackend.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Set;

/**
 * Zentraler Rechner für Dringlichkeit/Terminlage.
 *
 * dueSeverityVisual:
 *   - basiert auf Kalendertagen Abstand zu endDatum
 *   - entspricht dem, was aktuell die CSS-Klassen steuert
 *
 * dueSeverityPlanning:
 *   - basiert auf verbleibenden "Arbeitstagen" (Mo-Fr)
 *   - Wochenenden zählen nicht als verfügbare Zeit
 *   - Feiertage können später in holidays übergeben werden
 *
 * Rückgabe-Werte sind:
 *   "OVERDUE" | "WARN" | "OK"
 *
 * (Wir halten's erstmal minimal. "NONE"/"SOON" können wir später dazunehmen.)
 */
public class DueDateEvaluator {

    /**
     * Ermittelt die visuelle Dringlichkeit ("linker Balken") basierend
     * auf Kalendertagen Abstand.
     *
     * Regeln (Stand heute, entspricht deinem Frontend):
     *
     *   daysDiff < 0            => OVERDUE
     *   daysDiff == 0           => WARN  (today)
     *   daysDiff <= 3           => WARN  (soon)
     *   daysDiff <= 7           => OK    (week)
     *   else                    => OK    (future)
     *
     *   endDatum == null        => OK
     */
    public static String calcVisualSeverity(LocalDate endDatum, LocalDate today) {
        if (endDatum == null) {
            return "OK";
        }

        long daysDiff = ChronoUnit.DAYS.between(today, endDatum);

        if (daysDiff < 0) {
            return "OVERDUE";
        }
        if (daysDiff == 0) {
            return "WARN";
        }
        if (daysDiff <= 3) {
            return "WARN";
        }
        // <=7, future, usw.
        return "OK";
    }

    /**
     * Ermittelt die Planungs-Dringlichkeit für Auslastung / Dashboard,
     * basierend auf verbleibenden "Arbeitstagen".
     *
     * Arbeitstage = Mo-Fr, ohne Wochenenden. Feiertage können optional
     * übergeben werden (Set<LocalDate>).
     *
     * Heuristik (erste Version):
     *
     *   remainingWorkDays < 0          => OVERDUE
     *   remainingWorkDays < 1          => WARN
     *   remainingWorkDays < 3          => WARN   (brennt bald)
     *   else                           => OK
     *
     *   endDatum == null               => OK
     */
    public static String calcPlanningSeverity(LocalDate endDatum,
                                               LocalDate today,
                                               Set<LocalDate> holidays) {
        if (endDatum == null) {
            return "OK";
        }

        double remaining = calcRemainingWorkDays(today, endDatum, holidays);

        if (remaining < 0) {
            return "OVERDUE";
        }
        if (remaining < 1) {
            return "WARN";
        }
        if (remaining < 3) {
            return "WARN";
        }

        return "OK";
    }

    /**
     * Zählt die verbleibenden produktiven Tage zwischen today (exklusive)
     * und endDatum (inklusive Zieltag-Anbruch grob). Samstage/Sonntage
     * zählen nicht. Feiertage aus holidays zählen nicht.
     *
     * Vereinfachung:
     * - Wenn endDatum vor today liegt, wird ein negativer Wert geliefert
     *   (z. B. -1).
     */
    public static double calcRemainingWorkDays(LocalDate today,
                                               LocalDate endDatum,
                                               Set<LocalDate> holidays) {

        if (endDatum.isBefore(today)) {
            // Schon drüber
            return -1.0;
        }

        double workDays = 0.0;

        LocalDate d = today;
        while (d.isBefore(endDatum)) {
            d = d.plusDays(1);

            boolean weekend = (d.getDayOfWeek().getValue() >= 6); // 6=Sat,7=Sun
            boolean holiday = holidays != null && holidays.contains(d);

            if (!weekend && !holiday) {
                workDays += 1.0;
            }
        }

        return workDays;
    }
}
