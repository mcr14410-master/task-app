package com.pp.taskmanagementbackend.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "tasks")
public class Task {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private String bezeichnung;
    private String teilenummer; private String kunde;
    @Column(name="zustaendig") private String zuständig;
    @Column(name="zusaetzliche_infos", length=2048) private String zusätzlicheInfos;
    @Column(name="end_datum") private LocalDate endDatum;
    @Column(name="aufwand_stunden") private Double aufwandStunden;
    @Column(name="arbeitsstation") private String arbeitsstation;
    @Enumerated(EnumType.STRING) private TaskStatus status = TaskStatus.NEU;
    @Column private Integer prioritaet = 0;
    @Column(name="fai", nullable=false) private boolean fai = false;
    @Column(name="qs",  nullable=false) private boolean qs  = false;
    @Version @Column(name = "version", nullable = false) private Integer version = 0;

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
    public boolean isFai(){return fai;} public void setFai(boolean v){this.fai=v;}
    public boolean isQs(){return qs;}  public void setQs(boolean v){this.qs=v;}
    public Integer getVersion() {return version;}
    public void setVersion(Integer version) {this.version = version;}
    
}
