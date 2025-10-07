package com.pp.taskmanagementbackend.mapper;

import com.pp.taskmanagementbackend.api.dto.TaskDto;
import com.pp.taskmanagementbackend.model.Task;
import com.pp.taskmanagementbackend.model.TaskStatus;

public class TaskMapper {

    public static TaskDto toDto(Task t) {
        if (t == null) return null;
        TaskDto dto = new TaskDto();
        dto.setId(t.getId());
        dto.setBezeichnung(t.getBezeichnung());
        dto.setTeilenummer(t.getTeilenummer());
        dto.setKunde(t.getKunde());
        dto.setZustaendig(t.getZustaendig());
        dto.setAufwandStunden(t.getAufwandStunden());
        dto.setZusaetzlicheInfos(t.getZusaetzlicheInfos());
        dto.setEndDatum(t.getEndDatum());
        dto.setArbeitsstation(t.getArbeitsstation());
        dto.setStatus(t.getStatus());
        dto.setPrioritaet(t.getPrioritaet());
        return dto;
    }

    /** Merge-Update für PATCH */
    public static void updateEntityFromDto(TaskDto dto, Task t) {
        if (dto == null || t == null) return;
        if (dto.getBezeichnung() != null) t.setBezeichnung(dto.getBezeichnung());
        if (dto.getTeilenummer() != null) t.setTeilenummer(dto.getTeilenummer());
        if (dto.getKunde() != null) t.setKunde(dto.getKunde());
        if (dto.getZustaendig() != null) t.setZustaendig(dto.getZustaendig());
        if (dto.getAufwandStunden() != null) t.setAufwandStunden(dto.getAufwandStunden());
        if (dto.getZusaetzlicheInfos() != null) t.setZusaetzlicheInfos(dto.getZusaetzlicheInfos());
        if (dto.getEndDatum() != null) t.setEndDatum(dto.getEndDatum());
        if (dto.getArbeitsstation() != null) t.setArbeitsstation(dto.getArbeitsstation());
        if (dto.getStatus() != null) t.setStatus(dto.getStatus());
        if (dto.getPrioritaet() != null) t.setPrioritaet(dto.getPrioritaet());
    }
//}

    public static Task toEntity(TaskDto dto) {
        if (dto == null) return null;
        Task t = new Task();
        t.setBezeichnung(dto.getBezeichnung());
        t.setTeilenummer(dto.getTeilenummer());
        t.setKunde(dto.getKunde());
        t.setZustaendig(dto.getZustaendig());
        t.setAufwandStunden(dto.getAufwandStunden());
        t.setZusaetzlicheInfos(dto.getZusaetzlicheInfos());
        t.setEndDatum(dto.getEndDatum());
        t.setArbeitsstation(dto.getArbeitsstation());
        t.setStatus(dto.getStatus());
        t.setPrioritaet(dto.getPrioritaet());
        return t;
    }
}
