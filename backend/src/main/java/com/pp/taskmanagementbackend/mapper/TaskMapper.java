package com.pp.taskmanagementbackend.mapper;

import com.pp.taskmanagementbackend.api.dto.TaskDto;
import com.pp.taskmanagementbackend.model.Task;

public class TaskMapper {
    public static TaskDto toDto(Task t){
        TaskDto dto = new TaskDto();
        dto.setId(t.getId());
        dto.setBezeichnung(t.getBezeichnung());
        dto.setTeilenummer(t.getTeilenummer());
        dto.setKunde(t.getKunde());
        dto.setZuständig(t.getZuständig());
        dto.setZusätzlicheInfos(t.getZusätzlicheInfos());
        dto.setEndDatum(t.getEndDatum());
        dto.setAufwandStunden(t.getAufwandStunden());
        dto.setStk(t.getStk());
        dto.setFa(t.getFa());
        dto.setDateipfad(t.getDateipfad());
        dto.setArbeitsstation(t.getArbeitsstation());
        dto.setStatus(t.getStatus());
        dto.setPrioritaet(t.getPrioritaet());
        dto.setFai(t.isFai());
        dto.setQs(t.isQs());
        return dto;
    }
    public static Task toEntity(TaskDto dto){
        Task t = new Task();
        updateEntityFromDto(dto, t);
        return t;
    }
    public static void updateEntityFromDto(TaskDto dto, Task t){
        if (dto.getBezeichnung()!=null) t.setBezeichnung(dto.getBezeichnung());
        if (dto.getTeilenummer()!=null) t.setTeilenummer(dto.getTeilenummer());
        if (dto.getKunde()!=null) t.setKunde(dto.getKunde());
        if (dto.getZuständig()!=null) t.setZuständig(dto.getZuständig());
        if (dto.getZusätzlicheInfos()!=null) t.setZusätzlicheInfos(dto.getZusätzlicheInfos());
        if (dto.getEndDatum()!=null) t.setEndDatum(dto.getEndDatum());
        if (dto.getAufwandStunden()!=null) t.setAufwandStunden(dto.getAufwandStunden());
        if (dto.getArbeitsstation()!=null) t.setArbeitsstation(dto.getArbeitsstation());
        if (dto.getStatus()!=null) t.setStatus(dto.getStatus());
        if (dto.getPrioritaet()!=null) t.setPrioritaet(dto.getPrioritaet());
        if (dto.getFai()!=null) t.setFai(dto.getFai());
        if (dto.getQs()!=null) t.setQs(dto.getQs());
        if (dto.getStk()!=null) t.setStk(dto.getStk());
        if (dto.getFa()!=null) t.setFa(dto.getFa());
        if (dto.getDateipfad()!=null) t.setDateipfad(dto.getDateipfad());
    }
}
