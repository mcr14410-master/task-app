package com.pp.taskmanagementbackend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;

@Entity // ✅ Hibernate erkennt dies nun als verwaltete Entität
public class Arbeitsstation {
    
    @Id // ⬅️ NEU: ID ist der Primärschlüssel
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Sagt der DB, sie soll die ID generieren (z.B. auto_increment)
    private Long id;
    
    // Name ist jetzt ein normales Attribut (keine @Id mehr)
    private String name;
    
    private int sortOrder;

    // Standard-Konstruktor (für JPA/Hibernate benötigt)
    public Arbeitsstation() {
    }

    // Konstruktor ohne ID (da die DB sie generiert)
    public Arbeitsstation(String name, int sortOrder) {
        this.name = name;
        this.sortOrder = sortOrder;
    }

    // --- GETTER UND SETTER ---
    
    public Long getId() {
        return id;
    }

    // Setter für id (optional, kann aber für Tests nützlich sein)
    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}