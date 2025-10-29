// frontend/src/components/settings/DueDateSettingsTab.jsx
import React from "react";

/**
 * DueDateSettingsTab (Lesemodus)
 * - Zeigt die Standard-Buckets für Fälligkeit an
 * - "overdue" und "today" sind FIX (nur Farben später änderbar)
 * - "soon", "week", "future" sind variabel (werden in S2 editierbar)
 *
 * In S2 rüsten wir:
 * - Editierbarkeit (min/max/Farbe)
 * - Neue Buckets hinzufügen
 * - Validierung (keine Überschneidungen)
 */
export default function DueDateSettingsTab() {
  const buckets = [
    { key: "overdue", label: "Überfällig", range: "< 0", color: "#ef4444", fixed: true },
    { key: "today", label: "Heute", range: "= 0", color: "rgb(245,86,10)", fixed: true },
    { key: "soon", label: "Bald (≤ 3 Tage)", range: "1–3", color: "#facc15", fixed: false },
    { key: "week", label: "Woche (≤ 7 Tage)", range: "4–7", color: "#0ea5e9", fixed: false },
    { key: "future", label: "Zukunft (> 7 Tage)", range: "> 7", color: "#94a3b8", fixed: false },
  ];

  return (
    <section role="tabpanel" aria-label="Fälligkeit">
      <h3 style={{ margin: "8px 0 12px 0" }}>Fälligkeit – Buckets (Lesemodus)</h3>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #555" }}>
            <th style={{ textAlign: "left", padding: "4px 8px" }}>Key</th>
            <th style={{ textAlign: "left", padding: "4px 8px" }}>Label</th>
            <th style={{ textAlign: "left", padding: "4px 8px" }}>Tage-Bereich</th>
            <th style={{ textAlign: "left", padding: "4px 8px" }}>Farbe</th>
            <th style={{ textAlign: "left", padding: "4px 8px" }}>Typ</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.key} style={{ borderBottom: "1px solid #333" }}>
              <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>{b.key}</td>
              <td style={{ padding: "4px 8px" }}>{b.label}</td>
              <td style={{ padding: "4px 8px" }}>{b.range}</td>
              <td style={{ padding: "4px 8px" }}>
                <div
                  style={{
                    display: "inline-block",
                    width: 20,
                    height: 20,
                    background: b.color,
                    borderRadius: 4,
                    border: "1px solid #555",
                    marginRight: 6,
                    verticalAlign: "middle",
                  }}
                />
                <span style={{ color: "#aaa" }}>{b.color}</span>
              </td>
              <td style={{ padding: "4px 8px", color: b.fixed ? "#f87171" : "#9ca3af" }}>
                {b.fixed ? "fix" : "variabel"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: 16,
          fontSize: 13,
          color: "#9ca3af",
          background: "rgba(255,255,255,0.04)",
          padding: 12,
          borderRadius: 8,
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>Hinweis:</strong> „Überfällig“ und „Heute“ sind System-Buckets – Grenzen fix
          (nur Farbe änderbar). „Bald“, „Woche“ und „Zukunft“ werden später frei konfigurierbar,
          inkl. neuer zusätzlicher Buckets.
        </p>
        <p style={{ margin: "8px 0 0 0" }}>
          Das Dashboard nutzt Arbeitstage (Sa/So ausgenommen). Feiertage werden in einem späteren
          Schritt konfigurierbar.
        </p>
      </div>
    </section>
  );
}
