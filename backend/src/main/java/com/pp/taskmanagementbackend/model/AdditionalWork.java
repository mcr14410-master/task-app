package com.pp.taskmanagementbackend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "additional_works")
public class AdditionalWork {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** technischer Schlüssel, z. B. "FAI" */
    @Column(nullable = false, length = 64)
    private String code;

    /** Anzeigename */
    @Column(nullable = false, length = 200)
    private String label;

    /** freie Typisierung (z. B. "quality", "logistics") */
    @Column(length = 64)
    private String type;

    /** optionale Flags als JSON (PostgreSQL jsonb) */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String flags;

    @Column(nullable = false)
    private Boolean active = Boolean.TRUE;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "color_bg", length = 16)
    private String colorBg;

    @Column(name = "color_fg", length = 16)
    private String colorFg;

    @Column(name = "is_final", nullable = false)
    private Boolean isFinal = Boolean.FALSE;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // --- getters & setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getFlags() { return flags; }
    public void setFlags(String flags) { this.flags = flags; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public String getColorBg() { return colorBg; }
    public void setColorBg(String colorBg) { this.colorBg = colorBg; }

    public String getColorFg() { return colorFg; }
    public void setColorFg(String colorFg) { this.colorFg = colorFg; }

    public Boolean getIsFinal() { return isFinal; }
    public void setIsFinal(Boolean isFinal) { this.isFinal = isFinal; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
