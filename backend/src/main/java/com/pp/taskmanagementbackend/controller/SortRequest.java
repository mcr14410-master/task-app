package com.pp.taskmanagementbackend.controller;

import java.util.List;

/**
 * Request-DTO für das Persistieren der DnD-Sortierung.
 * Unterstützt sowohl das neue Format ({ arbeitsstationId, orderedIds })
 * als auch das ältere Alias-Format ({ columnId, order }).
 */
public class SortRequest {
    public Long arbeitsstationId;     // bevorzugt (neues Frontend)
    public List<Long> orderedIds;

    // Aliasse für ältere Frontends:
    public Long columnId;
    public List<Long> order;

    public Long stationId() { return arbeitsstationId != null ? arbeitsstationId : columnId; }
    public List<Long> ids() { return orderedIds != null ? orderedIds : order; }
}
