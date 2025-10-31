package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.service.StatsService;
import com.pp.taskmanagementbackend.service.StatsService.StationLoadAggregate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Liefert Kennzahlen zur aktuellen Auslastung pro Arbeitsstation.
 *
 * Endpoint wird später vom Dashboard-Frontend abgefragt.
 */
@RestController
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/api/stats/auslastung")
    public List<StationLoadResponse> getStationLoad() {

        Map<String, StationLoadAggregate> raw = statsService.collectStationLoad();

        List<StationLoadResponse> result = new ArrayList<>();
        for (Map.Entry<String, StationLoadAggregate> entry : raw.entrySet()) {
            String stationName = entry.getKey();
            StationLoadAggregate agg = entry.getValue();

            StationLoadResponse dto = new StationLoadResponse();
            dto.setArbeitsstation(stationName);
            dto.setHoursTotal(agg.hoursTotal);
            dto.setTasksTotal(agg.tasksTotal);
            dto.setTasksWarn(agg.tasksWarn);
            dto.setTasksOverdue(agg.tasksOverdue);

            result.add(dto);
        }

        return result;
    }

    /**
     * Antwort-Objekt für das Dashboard.
     * Wird als JSON zurückgegeben.
     */
    public static class StationLoadResponse {
        private String arbeitsstation;
        private double hoursTotal;
        private int tasksTotal;
        private int tasksWarn;
        private int tasksOverdue;

        public String getArbeitsstation() {
            return arbeitsstation;
        }

        public void setArbeitsstation(String arbeitsstation) {
            this.arbeitsstation = arbeitsstation;
        }

        public double getHoursTotal() {
            return hoursTotal;
        }

        public void setHoursTotal(double hoursTotal) {
            this.hoursTotal = hoursTotal;
        }

        public int getTasksTotal() {
            return tasksTotal;
        }

        public void setTasksTotal(int tasksTotal) {
            this.tasksTotal = tasksTotal;
        }

        public int getTasksWarn() {
            return tasksWarn;
        }

        public void setTasksWarn(int tasksWarn) {
            this.tasksWarn = tasksWarn;
        }

        public int getTasksOverdue() {
            return tasksOverdue;
        }

        public void setTasksOverdue(int tasksOverdue) {
            this.tasksOverdue = tasksOverdue;
        }
    }
}
