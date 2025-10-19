// frontend/src/components/settings/SettingsModal.jsx
import React, { useEffect, useRef, useState } from "react";
import StatusManagementContent from "./StatusManagementContent";
import StationManagementContent from "./StationManagementContent";

export default function SettingsModal({
  open,
  onClose,
  initialTab = "statuses",    // "stations" | "statuses"
  // Stationen-Props vom TaskBoard:
  stations = [],
  onUpdate = () => {},        // wird in StationManagementContent nach "Reihenfolge speichern" aufgerufen
}) {
  const [tab, setTab] = useState(initialTab);
  const dialogRef = useRef(null);

  // ESC schließt
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Bei Öffnen initialen Tab setzen & Fokus ins Modal
  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setTimeout(() => dialogRef.current?.focus(), 0);
    }
  }, [open, initialTab]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Einstellungen"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.45)",
        display: "grid", placeItems: "center"
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          width: 1000, maxWidth: "95vw", maxHeight: "90vh", overflow: "hidden",
          background: "var(--color-surface, #111827)",
          color: "var(--color-text, #e5e7eb)",
          borderRadius: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
          display: "grid", gridTemplateRows: "auto auto 1fr"
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px",
          borderBottom: "1px solid #ffffff22"
        }}>
          <strong style={{ fontSize: 18 }}>Einstellungen</strong>
          <span style={{ marginLeft: "auto" }} />
          <button
            onClick={onClose}
            aria-label="Schließen"
            title="Schließen"
            style={{
              border: "none", background: "transparent", color: "inherit",
              fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 4
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Einstellungen Kategorien"
          style={{
            display: "flex", gap: 6, padding: 8, borderBottom: "1px solid #ffffff16",
            background: "rgba(255,255,255,0.02)"
          }}
        >
          <TabButton
            active={tab === "stations"}
            onClick={() => setTab("stations")}
            id="tab-stations"
            controls="panel-stations"
          >
            Stationen
          </TabButton>
          <TabButton
            active={tab === "statuses"}
            onClick={() => setTab("statuses")}
            id="tab-statuses"
            controls="panel-statuses"
          >
            Status
          </TabButton>
        </div>

        {/* Inhalt */}
        <div style={{ overflow: "auto", padding: 12 }}>
          {tab === "stations" && (
            <section role="tabpanel" id="panel-stations" aria-labelledby="tab-stations">
              <StationManagementContent
                stations={stations}
                onUpdate={onUpdate}
              />
            </section>
          )}

          {tab === "statuses" && (
            <section role="tabpanel" id="panel-statuses" aria-labelledby="tab-statuses">
              <StatusManagementContent />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, id, controls, children }) {
  return (
    <button
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid " + (active ? "#ffffff44" : "#ffffff22"),
        background: active ? "#ffffff14" : "transparent",
        color: "inherit",
        cursor: "pointer",
        fontWeight: active ? 700 : 500
      }}
    >
      {children}
    </button>
  );
}
