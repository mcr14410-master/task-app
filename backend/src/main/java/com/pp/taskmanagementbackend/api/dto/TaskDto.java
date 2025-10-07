package com.pp.taskmanagementbackend.api.dto;

import com.pp.taskmanagementbackend.model.TaskStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class TaskDto {

    private Long id;
    private String bezeichnung;
    private String teilenummer;
    private String kunde;

    @JsonProperty("zuständig")
    private String zustaendig;

    private Double aufwandStunden;

    @JsonProperty("zusätzlicheInfos")
    private String zusaetzlicheInfos;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate endDatum;

    private String arbeitsstation;
    private TaskStatus status;
    private Integer prioritaet;

    public TaskDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBezeichnung() { return bezeichnung; }
    public void setBezeichnung(String bezeichnung) { this.bezeichnung = bezeichnung; }

    public String getTeilenummer() { return teilenummer; }
    public void setTeilenummer(String teilenummer) { this.teilenummer = teilenummer; }

    public String getKunde() { return kunde; }
    public void setKunde(String kunde) { this.kunde = kunde; }

    public String getZustaendig() { return zustaendig; }
    public void setZustaendig(String zustaendig) { this.zustaendig = zustaendig; }

    public Double getAufwandStunden() { return aufwandStunden; }
    public void setAufwandStunden(Double aufwandStunden) { this.aufwandStunden = aufwandStunden; }

    public String getZusaetzlicheInfos() { return zusaetzlicheInfos; }
    public void setZusaetzlicheInfos(String zusaetzlicheInfos) { this.zusaetzlicheInfos = zusaetzlicheInfos; }

    public LocalDate getEndDatum() { return endDatum; }
    public void setEndDatum(LocalDate endDatum) { this.endDatum = endDatum; }

    public String getArbeitsstation() { return arbeitsstation; }
    public void setArbeitsstation(String arbeitsstation) { this.arbeitsstation = arbeitsstation; }

    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }

    public Integer getPrioritaet() { return prioritaet; }
    public void setPrioritaet(Integer prioritaet) { this.prioritaet = prioritaet; }
}
