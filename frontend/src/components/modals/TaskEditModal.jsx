// src/components/modals/TaskEditModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const STATUS_COLORS = {
  NEU: "#6366f1",
  TO_DO: "#f59e0b",
  IN_PROGRESS: "#22c55e",
  DONE: "#10b981",
  GESPERRT: "#ef4444",
};
const STATUSES = ["NEU", "TO_DO", "IN_PROGRESS", "DONE", "GESPERRT"];

const DENSE = true;
const MODAL_DUR_MS = 240;

const ui = {
  overlay: { position: "fixed", inset: 0, background: "rgba(3,10,22,0.65)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 16 },
  modalBase: { background: "linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(15,23,42,0.98) 100%)", color: "#e5e7eb", border: "1px solid #1f2937", borderRadius: 12, width: 640, maxWidth: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" },
  container: { padding: DENSE ? "18px 20px" : "20px 22px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #233145" },
  title: { fontSize: "1.08rem", color: "#93c5fd", margin: 0 },
  section: { background: "linear-gradient(180deg,#0b1220,#0f172a)", border: "1px solid #1f2937", padding: DENSE ? 10 : 12, borderRadius: 10, marginBottom: DENSE ? 8 : 10 },
  sectionTitle: { margin: "0 0 8px 0", fontSize: "0.78rem", color: "#94a3b8", borderBottom: "1px dashed #233145", paddingBottom: 5, textTransform: "uppercase", fontWeight: 700, letterSpacing: ".06em" },
  label: { display: "block", marginBottom: 5, fontWeight: 700, color: "#d1d5db", fontSize: ".88rem" },
  inputBase: { width: "100%", padding: DENSE ? "7px 9px" : "8px 10px", border: "1px solid #243146", borderRadius: 9, background: "linear-gradient(180deg,#0f172a,#0b1220)", color: "#e5e7eb", fontSize: ".92rem", outline: "none" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: DENSE ? 10 : 12 },
  badgeRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 },
  badge: (bg, selected) => ({
    background: bg, color: "#fff", padding: DENSE ? "4px 8px" : "5px 9px", borderRadius: 999, fontSize: ".76rem", fontWeight: 800,
    border: `1px solid ${selected ? "#fff" : "#1f2937"}`, boxShadow: selected ? "0 0 0 3px rgba(255,255,255,.12)" : "none", cursor: "pointer", userSelect: "none",
  }),
  footer: { marginTop: DENSE ? 8 : 10, display: "flex", justifyContent: "space-between", gap: 8, paddingTop: DENSE ? 8 : 10, borderTop: "1px solid #233145" },
  danger: { padding: DENSE ? "8px 14px" : "9px 16px", background: "linear-gradient(180deg,#dc2626,#b91c1c)", color: "#fff", border: "1px solid #7f1d1d", borderRadius: 9, cursor: "pointer", fontWeight: 800 },
  secondary: { padding: DENSE ? "8px 14px" : "9px 16px", background: "linear-gradient(180deg,#111827,#0b1220)", color: "#e5e7eb", border: "1px solid #233145", borderRadius: 9, cursor: "pointer", fontWeight: 700 },
  primary: { padding: DENSE ? "8px 14px" : "9px 16px", background: "linear-gradient(180deg,#22c55e,#16a34a)", color: "#fff", border: "1px solid #065f46", borderRadius: 9, cursor: "pointer", fontWeight: 800 },
};

const toInputDate = (d) => {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dt = new Date(d); if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, "0"), day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function TaskEditModal({ isOpen, task, stations = [], onSaved, onClose, onRequestDelete }) {
  const [data, setData] = useState({
    bezeichnung: "", teilenummer: "", kunde: "", endDatum: "",
    aufwandStunden: 0, zuständig: "", zusätzlicheInfos: "",
    arbeitsstation: "Unassigned", id: null, status: "NEU",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const modalRef = useRef(null);
  const titleId = "edit-modal-title";

  const names = useMemo(() => {
    const arr = Array.isArray(stations) ? stations : [];
    return ["Unassigned", ...arr.filter((n) => String(n).trim().toLowerCase() !== "unassigned")];
  }, [stations]);

  useEffect(() => {
    if (!task?.id) return;
    setData({
      bezeichnung: task.bezeichnung || "",
      teilenummer: task.teilenummer || "",
      kunde: task.kunde || "",
      zusätzlicheInfos: task["zusätzlicheInfos"] || "",
      aufwandStunden: task.aufwandStunden ?? 0,
      zuständig: task.zuständig || "",
      endDatum: toInputDate(task.endDatum),
      arbeitsstation: task.arbeitsstation || "Unassigned",
      id: task.id,
      status: task.status || "NEU",
    });
    setSubmitError(null);
  }, [task?.id, isOpen]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setData((p) => ({ ...p, [name]: type === "number" ? (value === "" ? 0 : parseFloat(value)) : value }));
  };
  const setStatus = (s) => setData((p) => ({ ...p, status: s }));

  const validate = () => (!data.bezeichnung.trim() ? "Die Bezeichnung ist ein Pflichtfeld!" : null);

  const handleSave = async () => {
    const v = validate(); if (v) { setSubmitError(v); return; }
    setIsSaving(true); setSubmitError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      const saved = await res.json().catch(() => data);
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setSubmitError(err?.message || "Unbekannter Fehler beim Speichern.");
      console.error(err);
    } finally { setIsSaving(false); }
  };

  if (!isOpen || !task?.id) return null;

  return (
    <div style={ui.overlay} onClick={(e) => e.stopPropagation()}>
      <div
        style={ui.modalBase}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div style={ui.container}>
          <div style={ui.header}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h2 id={titleId} style={ui.title}>Aufgabe bearbeiten</h2>
              <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #1e3a8a", background: "linear-gradient(180deg,#0f172a,#0b1220)", color: "#dbeafe", fontSize: ".82rem" }}>
                ✏️ <span style={{ fontVariantNumeric: "tabular-nums" }}>#{task.id}</span>
              </span>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: 0, color: "#9ca3af", fontSize: 20, cursor: "pointer" }} aria-label="Schließen">×</button>
          </div>

          {submitError && <p style={{ color: "#fca5a5", marginTop: 0 }}>{submitError}</p>}

          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div style={ui.section}>
              <h3 style={ui.sectionTitle}>Basisdaten & Zuweisung</h3>

              <div>
                <label style={ui.label} htmlFor="bezeichnung">Bezeichnung *</label>
                <input style={ui.inputBase} type="text" id="bezeichnung" name="bezeichnung" value={data.bezeichnung} onChange={handleChange} required disabled={isSaving} />
              </div>

              <div style={{ height: 8 }} />

              <div style={ui.grid2}>
                <div>
                  <label style={ui.label} htmlFor="teilenummer">Teilenummer</label>
                  <input style={ui.inputBase} type="text" id="teilenummer" name="teilenummer" value={data.teilenummer} onChange={handleChange} disabled={isSaving} />
                </div>
                <div>
                  <label style={ui.label} htmlFor="kunde">Kunde</label>
                  <input style={ui.inputBase} type="text" id="kunde" name="kunde" value={data.kunde} onChange={handleChange} disabled={isSaving} />
                </div>
                <div>
                  <label style={ui.label} htmlFor="endDatum">Enddatum</label>
                  <input style={ui.inputBase} type="date" id="endDatum" name="endDatum" value={data.endDatum} onChange={handleChange} disabled={isSaving} />
                </div>
                <div>
                  <label style={ui.label} htmlFor="aufwandStunden">Aufwand (Std.)</label>
                  <input style={ui.inputBase} type="number" min="0" step="0.25" id="aufwandStunden" name="aufwandStunden" value={data.aufwandStunden} onChange={handleChange} disabled={isSaving} />
                </div>
                <div>
                  <label style={ui.label} htmlFor="zuständig">Zuständigkeit</label>
                  <input style={ui.inputBase} type="text" id="zuständig" name="zuständig" value={data.zuständig} onChange={handleChange} disabled={isSaving} />
                </div>
                <div>
                  <label style={ui.label} htmlFor="arbeitsstation">Station</label>
                  <select style={ui.inputBase} id="arbeitsstation" name="arbeitsstation" value={data.arbeitsstation} onChange={handleChange} disabled={isSaving}>
                    {names.map((n) => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
              </div>

              <div style={{ height: 8 }} />

              <div>
                <label style={ui.label}>Status</label>
                <div style={ui.badgeRow}>
                  {STATUSES.map((s) => {
                    const selected = data.status === s;
                    return (
                      <span key={s} role="button" tabIndex={0} aria-pressed={selected}
                        onClick={() => setStatus(s)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setStatus(s)}
                        style={ui.badge(STATUS_COLORS[s], selected)}>
                        {s}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={ui.section}>
              <h3 style={ui.sectionTitle}>Infos</h3>
              <textarea
                style={{ ...ui.inputBase, minHeight: 86, resize: "vertical" }}
                id="zusätzlicheInfos" name="zusätzlicheInfos"
                value={data.zusätzlicheInfos}
                onChange={handleChange}
                disabled={isSaving}
                placeholder="Kurzbeschreibung / Notizen"
              />
            </div>

            <div style={ui.footer}>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={ui.danger} onClick={() => onRequestDelete?.(task)} disabled={isSaving}>🗑 Löschen</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={ui.secondary} onClick={onClose} disabled={isSaving}>Abbrechen</button>
                <button type="submit" style={ui.primary} disabled={isSaving}>{isSaving ? "Speichern…" : "Speichern"}</button>
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}

export default React.memo(TaskEditModal);
