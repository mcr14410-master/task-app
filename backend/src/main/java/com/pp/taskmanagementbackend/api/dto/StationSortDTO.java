package com.pp.taskmanagementbackend.api.dto; // Passen Sie das Paket an

public class StationSortDTO {

    private String name;
    private int sortOrder;

    // Standard-Konstruktor
    public StationSortDTO() {
    }

    // Konstruktor mit allen Feldern
    public StationSortDTO(String name, int sortOrder) {
        this.name = name;
        this.sortOrder = sortOrder;
    }

    // Getter und Setter
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