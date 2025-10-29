import { useEffect, useState } from "react";

/**
 * Dashboard.jsx
 *
 * Zeigt die Auslastung / Engpässe pro Arbeitsstation.
 * Erwartet jetzt optional zwei Props:
 *   - showDashboard (bool)
 *   - onToggleDashboard (funktion)
 *
 * Wenn onToggleDashboard übergeben ist, wird oben rechts ein Button angezeigt,
 * damit man zurück aufs Board wechseln kann.
 */

export default function Dashboard({
  showDashboard = true,
  onToggleDashboard = () => {},
}) {
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/stats/auslastung");
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }

        const data = await res.json();

        if (alive) {
          // kritischste Stationen zuerst (viel rot > viel gelb)
          const sorted = [...data].sort((a, b) => {
            const scoreA =
              (a.tasksOverdue ?? 0) * 100 + (a.tasksWarn ?? 0) * 10;
            const scoreB =
              (b.tasksOverdue ?? 0) * 100 + (b.tasksWarn ?? 0) * 10;
            return scoreB - scoreA;
          });

          setStations(sorted);
          setLoading(false);
        }
      } catch (err) {
        if (alive) {
          console.error("Auslastung laden fehlgeschlagen:", err);
          setError("Konnte Auslastung nicht laden");
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  // Gleicher Button-Style wie im Board-Header (TaskBoard.jsx)
  const toolbarButtonStyle = {backgroundColor: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "0.5rem", color: "white", fontSize: "0.8rem", lineHeight: 1.2, padding: "0.4rem 0.6rem", cursor: "pointer", };


  // Wenn wir im Dashboard sind, soll der Button "Board" heißen.
  const backLabel = "Board";

  if (loading) {
    return (
      <div
        style={{
          padding: "1rem",
          color: "#ccc",
          fontFamily: "sans-serif",
          backgroundColor: "#1e1e1e",
          minHeight: "100vh",
        }}
      >
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
              fontWeight: "600",
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
            {backLabel}
          </button>
        </div>

        Lade Auslastung…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "1rem",
          color: "#f87171",
          fontFamily: "sans-serif",
          backgroundColor: "#1e1e1e",
          minHeight: "100vh",
        }}
      >
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
              fontWeight: "600",
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
            {backLabel}
          </button>
        </div>

        {error}
      </div>
    );
  }

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
            fontWeight: "600",
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
          {backLabel}
        </button>
      </div>

      {stations.length === 0 ? (
        <div style={{ color: "#888" }}>Keine offenen Aufgaben gefunden.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          {stations.map((st) => {
            const overdue = st.tasksOverdue ?? 0;
            const warn = st.tasksWarn ?? 0;
            const total = st.tasksTotal ?? 0;
            const hours = st.hoursTotal ?? 0;

            // Ampelfarbe für Überschrift der Karte
            let headlineColor = "#9ca3af"; // grau
            if (overdue > 0) {
              headlineColor = "#ef4444"; // rot
            } else if (warn > 0) {
              headlineColor = "#facc15"; // gelb
            }

            return (
              <div
                key={st.arbeitsstation}
                style={{
                  backgroundColor: "#0f172a",
                  borderRadius: "0.75rem",
                  padding: "0.75rem 1rem",
                  border: "1px solid #3a3a3a",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                {/* Kopf der Karte */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: headlineColor,
                      fontSize: "0.95rem",
                    }}
                  >
                    {st.arbeitsstation}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {hours.toFixed(1)} h
                  </div>
                </div>

                {/* Zahlenraster */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0,1fr))",
                    rowGap: "0.35rem",
                    columnGap: "0.75rem",
                    fontSize: "0.8rem",
                    lineHeight: "1.2rem",
                    color: "#d1d5db",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <div style={{ color: "#d1d5db" }}>
                    Tasks gesamt:
                    <div style={{ fontWeight: 600 }}>
                      {total}
                    </div>
                  </div>

                  <div style={{ color: "#ef4444" }}>
                    Überfällig:
                    <div style={{ fontWeight: 600 }}>
                      {overdue}
                    </div>
                  </div>

                  <div style={{ color: "#facc15" }}>
                    Kritisch bald:
                    <div style={{ fontWeight: 600 }}>
                      {warn}
                    </div>
                  </div>

                  <div style={{ color: "#9ca3af" }}>
                    Auslastung (h):
                    <div style={{ fontWeight: 600 }}>
                      {hours.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Interpretation */}
                <div
                  style={{
                    marginTop: "0.75rem",
                    fontSize: "0.7rem",
                    lineHeight: "1rem",
                    color: "#6b7280",
                  }}
                >
                  {overdue > 0
                    ? "🔥 Diese Station hat überfällige Arbeiten."
                    : warn > 0
                    ? "⚠ Enger Terminrahmen. Priorisieren."
                    : "✓ Kein akuter Termin-Druck."}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
