package com.pp.taskmanagementbackend.api.dto;

public class ArbeitsstationDTO {
    
    private Long id; // NEU: Wichtig für stabile Keys im Frontend
    private String name;
    private int sortOrder;

    // Standard-Konstruktor
    public ArbeitsstationDTO() {
    }

    // Konstruktor mit allen Feldern
    public ArbeitsstationDTO(Long id, String name, int sortOrder) {
        this.id = id;
        this.name = name;
        this.sortOrder = sortOrder;
    }

    // Getter und Setter
    public Long getId() {
        return id;
    }

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