// src/components/modals/TaskCreationModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const STATUS_COLORS = {
  NEU: "#6366f1",
  TO_DO: "#f59e0b",
  IN_PROGRESS: "#22c55e",
  DONE: "#10b981",
  GESPERRT: "#ef4444",
};
const STATUS_ORDER = ["NEU", "TO_DO", "IN_PROGRESS", "DONE", "GESPERRT"];

const DENSE = true;
const MODAL_DUR_MS = 240;

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(3,10,22,0.65)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 16 },
  modalBase: { background: "linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(15,23,42,0.98) 100%)", color: "#e5e7eb", border: "1px solid #1f2937", borderRadius: 12, width: 640, maxWidth: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" },
  container: { padding: DENSE ? "18px 20px" : "20px 22px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #233145" },
  title: { margin: 0, fontSize: "1.08rem", color: "#93c5fd" },
  section: { background: "linear-gradient(180deg,#0b1220,#0f172a)", border: "1px solid #1f2937", padding: DENSE ? 10 : 12, borderRadius: 10, marginBottom: DENSE ? 8 : 10 },
  sectionTitle: { margin: "0 0 8px 0", fontSize: "0.78rem", color: "#94a3b8", borderBottom: "1px dashed #233145", paddingBottom: 5, textTransform: "uppercase", fontWeight: 700, letterSpacing: ".06em" },
  label: { display: "block", marginBottom: 5, fontWeight: 700, color: "#d1d5db", fontSize: ".88rem" },
  inputBase: { width: "100%", padding: DENSE ? "7px 9px" : "8px 10px", border: "1px solid #243146", borderRadius: 9, background: "linear-gradient(180deg,#0f172a,#0b1220)", color: "#e5e7eb", fontSize: ".92rem", outline: "none" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: DENSE ? 10 : 12 },
  statusRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  pill: (active, color) => ({ padding: DENSE ? "4px 8px" : "5px 9px", borderRadius: 999, fontSize: ".76rem", fontWeight: 800, cursor: "pointer", userSelect: "none", background: active ? color : "#334155", color: "#fff", border: `1px solid ${active ? "#fff" : "#1f2937"}` }),
  footer: { marginTop: DENSE ? 8 : 10, display: "flex", justifyContent: "space-between", gap: 8, paddingTop: DENSE ? 8 : 10, borderTop: "1px solid #233145" },
  primary: { padding: DENSE ? "8px 14px" : "9px 16px", background: "linear-gradient(180deg,#2563eb,#1d4ed8)", color: "#fff", border: "1px solid #1e3a8a", borderRadius: 9, cursor: "pointer", fontWeight: 800 },
  secondary: { padding: DENSE ? "8px 14px" : "9px 16px", background: "linear-gradient(180deg,#111827,#0b1220)", color: "#e5e7eb", border: "1px solid #233145", borderRadius: 9, cursor: "pointer", fontWeight: 700 },
  ghost: { padding: DENSE ? "8px 12px" : "9px 12px", background: "transparent", color: "#93c5fd", border: "1px dashed #1e3a8a", borderRadius: 9, cursor: "pointer", fontWeight: 700 },
};

const defaultForm = () => ({
  bezeichnung: "", teilenummer: "", kunde: "", endDatum: "",
  aufwandStunden: 0, zuständig: "", zusätzlicheInfos: "",
  arbeitsstation: "Unassigned", status: "NEU", prioritaet: 9999,
});

function TaskCreationModal({ isOpen, stations = [], onCreated, onClose }) {
  const [form, setForm] = useState(defaultForm());
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const titleId = "create-modal-title";
  const modalRef = useRef(null);
  const formRef = useRef(null);

  const stationNames = useMemo(() => {
    const arr = Array.isArray(stations) ? stations : [];
    const uniq = [...new Set(arr.map((s) => String(s)))];
    const hasUn = uniq.some((n) => n.trim().toLowerCase() === "unassigned");
    const rest = uniq.filter((n) => n.trim().toLowerCase() !== "unassigned");
    return ["Unassigned", ...(hasUn ? rest : rest)];
  }, [stations]);

  useEffect(() => {
    if (isOpen) {
      setForm(defaultForm());
      setTimeout(() => modalRef.current?.querySelector("#bezeichnung")?.focus(), 0);
    }
  }, [isOpen]);

  const setValue = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const sanitize = (v) => (typeof v === "string" ? (v.trim() || null) : v ?? null);
  const buildPayload = () => {
    const payload = {
      bezeichnung: sanitize(form.bezeichnung),
      teilenummer: sanitize(form.teilenummer),
      kunde: sanitize(form.kunde),
      endDatum: sanitize(form.endDatum),
      aufwandStunden: Number.isFinite(Number(form.aufwandStunden)) ? Number(form.aufwandStunden) : 0,
      zuständig: sanitize(form.zuständig),
      zusätzlicheInfos: sanitize(form.zusätzlicheInfos),
      arbeitsstation: form.arbeitsstation || "Unassigned",
      status: form.status || "NEU",
      prioritaet: 9999,
    };
    Object.keys(payload).forEach((k) => payload[k] === null && delete payload[k]);
    return payload;
  };
  const validate = () => (!form.bezeichnung?.trim() ? "Bezeichnung ist ein Pflichtfeld." : null);

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    setErrorMsg(null);
    const v = validate(); if (v) { setErrorMsg(v); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      const saved = await res.json();
      onCreated?.(saved);
      onClose?.();
    } catch (err) {
      setErrorMsg(err?.message || "Unbekannter Fehler beim Erstellen.");
    } finally { setSubmitting(false); }
  };

  const handleCreateAndNew = async (e) => {
    e?.preventDefault?.();
    setErrorMsg(null);
    const v = validate(); if (v) { setErrorMsg(v); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      const saved = await res.json();
      onCreated?.(saved);
      setForm(defaultForm());
      setTimeout(() => modalRef.current?.querySelector("#bezeichnung")?.focus(), 0);
    } catch (err) {
      setErrorMsg(err?.message || "Unbekannter Fehler beim Erstellen.");
    } finally { setSubmitting(false); }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={(e) => e.stopPropagation()}>
      <div
        style={styles.modalBase}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div style={styles.container}>
          <div style={styles.header}>
            <h2 id={titleId} style={styles.title}>Neue Aufgabe</h2>
            <button onClick={onClose} style={{ background: "transparent", border: 0, color: "#9ca3af", fontSize: 20, cursor: "pointer" }} aria-label="Schließen">×</button>
          </div>

          {errorMsg && <div style={{ marginBottom: 10, padding: "9px 11px", backgroundColor: "#4f2b2b", color: "#ffdcdc", border: "1px solid #7f1d1d", borderRadius: 9, fontSize: ".9rem" }}>🚨 {errorMsg}</div>}

          <form ref={formRef} onSubmit={handleCreate}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Basisdaten</h3>

              <label style={styles.label} htmlFor="bezeichnung">Bezeichnung *</label>
              <input id="bezeichnung" type="text" style={styles.inputBase} value={form.bezeichnung} onChange={(e) => setValue("bezeichnung", e.target.value)} required disabled={submitting} />

              <div style={{ height: 8 }} />
              <div style={styles.grid2}>
                <div>
                  <label style={styles.label} htmlFor="teilenummer">Teilenummer</label>
                  <input id="teilenummer" type="text" style={styles.inputBase} value={form.teilenummer} onChange={(e) => setValue("teilenummer", e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <label style={styles.label} htmlFor="kunde">Kunde</label>
                  <input id="kunde" type="text" style={styles.inputBase} value={form.kunde} onChange={(e) => setValue("kunde", e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <label style={styles.label} htmlFor="endDatum">Enddatum</label>
                  <input id="endDatum" type="date" style={styles.inputBase} value={form.endDatum} onChange={(e) => setValue("endDatum", e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <label style={styles.label} htmlFor="aufwandStunden">Aufwand (Std.)</label>
                  <input id="aufwandStunden" type="number" min="0" step="0.25" style={styles.inputBase} value={form.aufwandStunden} onChange={(e) => setValue("aufwandStunden", e.target.value)} disabled={submitting} />
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Zuweisung & Status</h3>
              <div style={styles.grid2}>
                <div>
                  <label style={styles.label} htmlFor="zuständig">Zuständigkeit</label>
                  <input id="zuständig" type="text" style={styles.inputBase} value={form.zuständig} onChange={(e) => setValue("zuständig", e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <label style={styles.label} htmlFor="arbeitsstation">Arbeitsstation</label>
                  <select id="arbeitsstation" style={styles.inputBase} value={form.arbeitsstation} onChange={(e) => setValue("arbeitsstation", e.target.value)} disabled={submitting}>
                    {stationNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                  </select>
                </div>
              </div>

              <div style={{ height: 8 }} />
              <div>
                <label style={styles.label}>Status</label>
                <div style={styles.statusRow}>
                  {STATUS_ORDER.map((key) => (
                    <button key={key} type="button" onClick={() => setValue("status", key)}
                      style={styles.pill(form.status === key, STATUS_COLORS[key])} disabled={submitting} title={key}>
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Beschreibung</h3>
              <label style={styles.label} htmlFor="zusätzlicheInfos">Zusätzliche Infos</label>
              <textarea id="zusätzlicheInfos" style={{ ...styles.inputBase, minHeight: 88, resize: "vertical" }}
                value={form.zusätzlicheInfos} onChange={(e) => setValue("zusätzlicheInfos", e.target.value)} disabled={submitting} placeholder="Optional: Kurzbeschreibung" />
            </div>

            <div style={styles.footer}>
              <button type="button" style={styles.ghost} onClick={() => setForm(defaultForm())} disabled={submitting}>↺ Zurücksetzen</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={styles.secondary} onClick={onClose} disabled={submitting}>Abbrechen</button>
                <button type="button" style={styles.primary} onClick={handleCreateAndNew} disabled={submitting}>Speichern & Neu</button>
                <button type="submit" style={styles.primary} disabled={submitting}>Erstellen</button>
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}

export default React.memo(TaskCreationModal);
