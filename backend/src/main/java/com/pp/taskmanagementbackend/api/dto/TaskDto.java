package com.pp.taskmanagementbackend.api.dto;

import com.pp.taskmanagementbackend.model.TaskStatus;
import java.time.LocalDate;

public class TaskDto {
    private Long id;
    private String bezeichnung;
    private String teilenummer;
    private String kunde;
    private String zuständig;
    private String zusätzlicheInfos;
    private LocalDate endDatum;
    private Double aufwandStunden;
    private String arbeitsstation;
    private TaskStatus status;
    private Integer prioritaet;
    private Boolean fai;
    private Boolean qs;
    private Integer stk;
    private String fa;
    private String dateipfad;
    private Integer attachmentCount; // 0,1,2,...
    private String statusCode;

    public Long getId(){return id;} public void setId(Long id){this.id=id;}
    public String getBezeichnung(){return bezeichnung;} public void setBezeichnung(String v){this.bezeichnung=v;}
    public String getTeilenummer(){return teilenummer;} public void setTeilenummer(String v){this.teilenummer=v;}
    public String getKunde(){return kunde;} public void setKunde(String v){this.kunde=v;}
    public String getZuständig(){return zuständig;} public void setZuständig(String v){this.zuständig=v;}
    public String getZusätzlicheInfos(){return zusätzlicheInfos;} public void setZusätzlicheInfos(String v){this.zusätzlicheInfos=v;}
    public LocalDate getEndDatum(){return endDatum;} public void setEndDatum(LocalDate v){this.endDatum=v;}
    public Double getAufwandStunden(){return aufwandStunden;} public void setAufwandStunden(Double v){this.aufwandStunden=v;}
    public String getArbeitsstation(){return arbeitsstation;} public void setArbeitsstation(String v){this.arbeitsstation=v;}
    public TaskStatus getStatus(){return status;} public void setStatus(TaskStatus v){this.status=v;}
    public Integer getPrioritaet(){return prioritaet;} public void setPrioritaet(Integer v){this.prioritaet=v;}
    public Boolean getFai(){return fai;} public void setFai(Boolean v){this.fai=v;}
    public Boolean getQs(){return qs;} public void setQs(Boolean v){this.qs=v;}
    public Integer getStk(){return stk;} public void setStk(Integer v){this.stk=v;}
    public String getFa(){return fa;} public void setFa(String v){this.fa=v;}
    public String getDateipfad(){return dateipfad;} public void setDateipfad(String v){this.dateipfad=v;}

    public Integer getAttachmentCount() { return attachmentCount; }
    public void setAttachmentCount(Integer attachmentCount) { this.attachmentCount = attachmentCount; }
 // NEU:
    public String getStatusCode() { return statusCode; }
    public void setStatusCode(String statusCode) {this.statusCode = statusCode;}
    
    
}
