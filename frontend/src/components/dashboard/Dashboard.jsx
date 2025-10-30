import React from "react";
import UtilizationDashboard from "./UtilizationDashboard";
import PrintableBacklog from "./PrintableBacklog";

/**
 * Dashboard.jsx
 *
 * Wrapper für das Auslastungs-Dashboard.
 * – Oben: Überschrift + "Board"-Button (onToggleDashboard)
 * – Inhalt: UtilizationDashboard (Balken vs. Kapazität + Heatmap Station×Tag)
 *
 * Props:
 *   - showDashboard (bool)    – optional, wird hier nicht weiter genutzt
 *   - onToggleDashboard (fn)  – Button rechts oben, zurück zum Board
 */
export default function Dashboard({
  showDashboard = true,
  onToggleDashboard = () => {},
}) {
  const toolbarButtonStyle = {
    backgroundColor: "#3b82f6",
    border: "1px solid #3b82f6",
    borderRadius: "0.5rem",
    color: "white",
    fontSize: "0.8rem",
    lineHeight: 1.2,
    padding: "0.4rem 0.6rem",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        padding: "1rem",
        color: "#eee",
        backgroundColor: "#0b1220",
        fontFamily: "sans-serif",
        minHeight: "100vh",
      }}
    >
      {/* Kopfzeile mit Überschrift links, Rück-Button rechts */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1rem",
        }}
      >
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "#fff",
            margin: 0,
          }}
        >
          Auslastung / Engpässe
        </h1>

        <button
          style={toolbarButtonStyle}
          onClick={onToggleDashboard}
          title="Zurück zum Board"
        >
          Board
        </button>
      </div>

      {/* Neuer visueller Inhalt */}
      <UtilizationDashboard />
	  

	  <PrintableBacklog />
    </div>
  );
}
