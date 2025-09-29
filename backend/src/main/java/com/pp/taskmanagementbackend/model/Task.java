package com.pp.taskmanagementbackend.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "aufgaben")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Pflichtfeld: Bezeichnung
    @Column(nullable = false)
    private String bezeichnung;

    private String teilenummer;
    private String kunde;

    private LocalDate endDatum;

    private Double aufwandStunden;

    private String zuständig;

    @Column(length = 2000)
    private String zusätzlicheInfos;

    // Name der Arbeitsstation
    @Column(nullable = false)
    private String arbeitsstation;

    // Sortierung/Priorität innerhalb der Station
    @Column(nullable = false)
    private Integer prioritaet;

    // Status mit Default "NEU"
    @Column(nullable = false)
    private String status = "NEU";

    // NEU: Erstellungsdatum (NOT NULL, wird automatisch beim Insert gesetzt)
    @Column(name = "erstellungsdatum", nullable = false, updatable = false)
    private LocalDateTime erstellungsdatum;

    // ------------------------------------------------------------------------
    // Konstruktoren
    // ------------------------------------------------------------------------

    public Task() {
        // Werte werden zusätzlich in @PrePersist abgesichert
    }

    public Task(String bezeichnung, String arbeitsstation) {
        this.bezeichnung = bezeichnung;
        this.arbeitsstation = arbeitsstation;
        this.prioritaet = 9999;
        this.status = "NEU";
    }

    // ------------------------------------------------------------------------
    // Lifecycle-Callbacks
    // ------------------------------------------------------------------------

    @PrePersist
    public void onPrePersist() {
        // Falls Felder nicht gesetzt sind, sinnvolle Defaults setzen:
        if (this.prioritaet == null) {
            this.prioritaet = 9999;
        }
        if (this.status == null || this.status.trim().isEmpty()) {
            this.status = "NEU";
        }
        if (this.erstellungsdatum == null) {
            this.erstellungsdatum = LocalDateTime.now();
        }
    }

    // ------------------------------------------------------------------------
    // Getter & Setter
    // ------------------------------------------------------------------------

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBezeichnung() {
        return bezeichnung;
    }

    public void setBezeichnung(String bezeichnung) {
        this.bezeichnung = bezeichnung;
    }

    public String getTeilenummer() {
        return teilenummer;
    }

    public void setTeilenummer(String teilenummer) {
        this.teilenummer = teilenummer;
    }

    public String getKunde() {
        return kunde;
    }

    public void setKunde(String kunde) {
        this.kunde = kunde;
    }

    public LocalDate getEndDatum() {
        return endDatum;
    }

    public void setEndDatum(LocalDate endDatum) {
        this.endDatum = endDatum;
    }

    public Double getAufwandStunden() {
        return aufwandStunden;
    }

    public void setAufwandStunden(Double aufwandStunden) {
        this.aufwandStunden = aufwandStunden;
    }

    public String getZuständig() {
        return zuständig;
    }

    public void setZuständig(String zuständig) {
        this.zuständig = zuständig;
    }

    public String getZusätzlicheInfos() {
        return zusätzlicheInfos;
    }

    public void setZusätzlicheInfos(String zusätzlicheInfos) {
        this.zusätzlicheInfos = zusätzlicheInfos;
    }

    public String getArbeitsstation() {
        return arbeitsstation;
    }

    public void setArbeitsstation(String arbeitsstation) {
        this.arbeitsstation = arbeitsstation;
    }

    public Integer getPrioritaet() {
        return prioritaet;
    }

    public void setPrioritaet(Integer prioritaet) {
        this.prioritaet = prioritaet;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            this.status = "NEU";
        } else {
            this.status = status;
        }
    }

    public LocalDateTime getErstellungsdatum() {
        return erstellungsdatum;
    }

    public void setErstellungsdatum(LocalDateTime erstellungsdatum) {
        this.erstellungsdatum = erstellungsdatum;
    }
}
