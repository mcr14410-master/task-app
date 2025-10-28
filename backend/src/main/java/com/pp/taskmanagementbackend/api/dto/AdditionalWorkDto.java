package com.pp.taskmanagementbackend.api.dto;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class AdditionalWorkDto {
    private Long id;
    private String code;
    private String label;
    private Boolean active;
    private Integer sortOrder;
    private String colorBg;
    private String colorFg;
    private List<String> flags;
    private String type;
    private Boolean isFinal;

    // ---- helpers ----

    // Entity -> DTO
    public static AdditionalWorkDto fromEntity(com.pp.taskmanagementbackend.model.AdditionalWork aw) {
        AdditionalWorkDto dto = new AdditionalWorkDto();
        dto.id = aw.getId();
        dto.code = aw.getCode();
        dto.label = aw.getLabel();
        dto.active = aw.getActive();
        dto.sortOrder = aw.getSortOrder();
        dto.colorBg = aw.getColorBg();
        dto.colorFg = aw.getColorFg();
        dto.type = aw.getType();
        dto.isFinal = aw.getIsFinal();

        String rawFlags = aw.getFlags();
        if (rawFlags == null || rawFlags.isBlank()) {
            dto.flags = Collections.emptyList();
        } else {
            dto.flags = Arrays.stream(rawFlags.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }

        return dto;
    }

    // DTO -> brandneues Entity (POST)
    public void applyToNewEntity(com.pp.taskmanagementbackend.model.AdditionalWork target) {
        target.setId(null);
        target.setCode(this.code);
        target.setLabel(this.label);

        // Defaults für active/sortOrder wie vorher
        target.setActive(this.active != null ? this.active : Boolean.TRUE);
        target.setSortOrder(this.sortOrder != null ? this.sortOrder : 0);

        target.setColorBg(this.colorBg);
        target.setColorFg(this.colorFg);

        target.setType(this.type);

        // <- wichtig: isFinal darf in DB nicht null sein
        if (this.isFinal != null) {
            target.setIsFinal(this.isFinal);
        } else {
            target.setIsFinal(Boolean.FALSE); // DEFAULT
        }

        // flags: Liste -> kommagetrennt
        if (this.flags != null && !this.flags.isEmpty()) {
            target.setFlags(String.join(",", this.flags));
        } else {
            target.setFlags(null);
        }
    }

    // DTO -> bestehendes Entity patchen (PUT)
    public void applyPatchToEntity(com.pp.taskmanagementbackend.model.AdditionalWork target) {
        if (this.code != null && !this.code.isBlank()) {
            target.setCode(this.code);
        }
        if (this.label != null && !this.label.isBlank()) {
            target.setLabel(this.label);
        }
        if (this.type != null) {
            target.setType(this.type);
        }
        if (this.isFinal != null) {
            target.setIsFinal(this.isFinal);
        }
        if (this.active != null) {
            target.setActive(this.active);
        }
        if (this.sortOrder != null) {
            target.setSortOrder(this.sortOrder);
        }
        if (this.colorBg != null) {
            target.setColorBg(this.colorBg);
        }
        if (this.colorFg != null) {
            target.setColorFg(this.colorFg);
        }

        if (this.flags != null) {
            if (!this.flags.isEmpty()) {
                target.setFlags(String.join(",", this.flags));
            } else {
                target.setFlags(null);
            }
        }
    }

    // ---- getters / setters ----
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public String getColorBg() { return colorBg; }
    public void setColorBg(String colorBg) { this.colorBg = colorBg; }

    public String getColorFg() { return colorFg; }
    public void setColorFg(String colorFg) { this.colorFg = colorFg; }

    public List<String> getFlags() { return flags; }
    public void setFlags(List<String> flags) { this.flags = flags; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Boolean getIsFinal() { return isFinal; }
    public void setIsFinal(Boolean isFinal) { this.isFinal = isFinal; }
}
