package com.pp.taskmanagementbackend.service;

import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.repository.TaskRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Aggregiert Kennzahlen für die Auslastung je Arbeitsstation.
 *
 * Dieses Service wird im nächsten Schritt vom StatsController verwendet.
 *
 * Kennzahlen je Station:
 *  - hoursTotal: Summe aller AufwandStunden offener Tasks
 *  - tasksTotal: Anzahl offener Tasks
 *  - tasksWarn:  Anzahl offener Tasks mit dueSeverityPlanning == "WARN"
 *  - tasksOverdue: Anzahl offener Tasks mit dueSeverityPlanning == "OVERDUE"
 *
 * "offen" = Task ist nicht fertig. Die Logik dafür steckt in isFertig(t)
 * und kann an deine echten StatusCodes angepasst werden.
 *
 * Hinweis:
 * Wir rechnen die Dringlichkeit (WARN/OVERDUE) hier nochmal selbst
 * über DueDateEvaluator.calcPlanningSeverity(...) damit der Service
 * unabhängig davon funktioniert, ob der Mapper schon gelaufen ist.
 */
@Service
public class StatsService {

    private final TaskRepository taskRepository;

    public StatsService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    /**
     * Liefert eine Map je Arbeitsstation.
     *
     * Key   = Name der Arbeitsstation (String)
     * Value = kleines Aggregationsobjekt mit den Feldern:
     *         hoursTotal, tasksTotal, tasksWarn, tasksOverdue
     *
     * Diese Map wird im Controller in DTOs verwandelt und als JSON ausgegeben.
     */
    public Map<String, StationLoadAggregate> collectStationLoad() {

        // TODO: mittelfristig besser: nur "offene" Tasks direkt per Query holen
        List<Task> allTasks = taskRepository.findAll();

        Map<String, StationLoadAggregate> agg = new HashMap<>();

        LocalDate today = LocalDate.now();

        for (Task t : allTasks) {

            // fertige Tasks belasten die Auslastung nicht mehr
            if (isFertig(t)) {
                continue;
            }

            String station = t.getArbeitsstation();
            if (station == null || station.isBlank()) {
                station = "(ohne Station)";
            }

            StationLoadAggregate slot = agg.computeIfAbsent(station, k -> new StationLoadAggregate());

            // Aufwandstunden addieren
            double hrs = t.getAufwandStunden() != null ? t.getAufwandStunden() : 0.0;
            slot.hoursTotal += hrs;

            // Task zählen
            slot.tasksTotal += 1;

            // Dringlichkeit für Planung (Wochenenden berücksichtigt)
            String planningSeverity = DueDateEvaluator.calcPlanningSeverity(
                    t.getEndDatum(),
                    today,
                    Collections.emptySet() // Feiertage später konfigurierbar
            );

            if ("OVERDUE".equals(planningSeverity)) {
                slot.tasksOverdue += 1;
            } else if ("WARN".equals(planningSeverity)) {
                slot.tasksWarn += 1;
            }
        }

        return agg;
    }

    /**
     * Hier definierst du, wann eine Task "fertig" ist und nicht mehr in die
     * Auslastung gehen soll.
     *
     * Bitte an deine echte Logik anpassen:
     * z.B. wenn du ein Feld statusCode hast und "FERTIG" bedeutet done,
     * dann:
     *
     *   return "FERTIG".equalsIgnoreCase(t.getStatusCode());
     *
     * Aktuell Default = false (also alles zählt als offen),
     * damit du erstmal Ergebnisse siehst.
     */
    private boolean isFertig(Task t) {
        return false;
    }

    /**
     * Kleiner interner Aggregationstyp. Kein @Entity, kein @Dto.
     * Der Controller wird daraus später echte DTOs bauen.
     */
    public static class StationLoadAggregate {
        public double hoursTotal = 0.0;
        public int tasksTotal = 0;
        public int tasksWarn = 0;
        public int tasksOverdue = 0;
    }
}
