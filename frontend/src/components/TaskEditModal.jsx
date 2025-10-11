// frontend/src/components/TaskEditModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "../config/TaskStatusTheme.css";
import "../config/AdditionalWorkTheme.css";
import useToast from "@/components/ui/useToast";
import apiErrorMessage from "@/utils/apiErrorMessage";
import AttachmentTab from "@/components/AttachmentTab";

const API_BASE_URL = "/api/tasks";

const UI = {
  overlay: {
    position: "fixed", inset: 0,
    backgroundColor: "rgba(2,6,23,.55)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 1000
  },
  modal: {
    backgroundColor: "#0b1220", color: "#e5e7eb",
    width: 820, maxWidth: "96vw",
    maxHeight: "90vh", overflowY: "auto",
    borderRadius: 14, border: "1px solid #1f2937",
    boxShadow: "0 30px 80px rgba(0,0,0,.6)",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 18px", borderBottom: "1px solid #1f2937"
  },
  title: { margin: 0, fontWeight: 800, color: "#60a5fa", fontSize: "1.05rem" },
  body: { padding: 18 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  label: { display: "block", marginBottom: 6, fontWeight: 600, color: "#d1d5db", fontSize: ".92rem" },
  input: {
    width: "100%", padding: "10px 12px",
    border: "1px solid #1f2937", borderRadius: 10,
    background: "#0f172a", color: "#e5e7eb",
    boxSizing: "border-box", outline: "none", fontSize: ".95rem"
  },
  textarea: { minHeight: 100, resize: "vertical" },
  section: { background: "#0f1526", border: "1px solid #1f2937", borderRadius: 12, padding: 14, marginBottom: 12 },
  sectionTitle: {
    margin: "0 0 10px 0", color: "#93c5fd", fontSize: ".8rem",
    letterSpacing: ".06em", textTransform: "uppercase", borderBottom: "1px solid #172033", paddingBottom: 8,
    fontWeight: 800
  },
  footer: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 18px", borderTop: "1px solid #1f2937"
  },
  btn: {
    base: { padding: "10px 14px", borderRadius: 10, cursor: "pointer", border: "1px solid transparent", fontWeight: 700 },
    primary: { background: "#3b82f6", borderColor: "#2563eb", color: "#fff" },
    secondary: { background: "transparent", borderColor: "#334155", color: "#cbd5e1" },
    danger: { background: "#ef4444", borderColor: "#dc2626", color: "#fff" }
  },
  tabs: {
    header: { display: "flex", gap: 8, borderBottom: "1px solid #172033", marginBottom: 12 },
    tab: (active) => ({
      padding: "8px 12px",
      borderRadius: "10px 10px 0 0",
      background: active ? "#13213a" : "transparent",
      color: active ? "#e5e7eb" : "#93a5bf",
      border: active ? "1px solid #1f2c47" : "1px solid transparent",
      borderBottomColor: active ? "#13213a" : "transparent",
      cursor: "pointer",
      fontWeight: 700,
    }),
  }
};

const STATUSES = ["NEU", "TO_DO", "IN_BEARBEITUNG", "FERTIG"];
const statusKey = (raw) => String(raw || "").toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");

export default function TaskEditModal({ task, stations = [], onSave, onClose, onDeleted, initialTab = "details" }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);

  const [form, setForm] = useState({
    id: null, bezeichnung: "", teilenummer: "", kunde: "",
    endDatum: "", aufwandStunden: 0, zuständig: "",
    zusätzlicheInfos: "", arbeitsstation: "",
    status: "NEU", fai: false, qs: false,
    stk: 0, fa: "", dateipfad: ""
  });
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (task) {
      setForm({
        id: task.id ?? null,
        bezeichnung: task.bezeichnung ?? "",
        teilenummer: task.teilenummer ?? "",
        kunde: task.kunde ?? "",
        endDatum: task.endDatum ? String(task.endDatum).split("T")[0] : "",
        aufwandStunden: Number.isFinite(task.aufwandStunden) ? task.aufwandStunden : 0,
        zuständig: task.zuständig ?? "",
        zusätzlicheInfos: task.zusätzlicheInfos ?? "",
        arbeitsstation: task.arbeitsstation || (stations[0]?.name ?? ""),
        status: task.status || "NEU",
        fai: !!task.fai,
        qs: !!task.qs,
        stk: Number.isFinite(task.stk) ? task.stk : 0,
        fa: task.fa ?? "",
        dateipfad: task.dateipfad ?? ""
      });
    }
  }, [task, stations]);

  useEffect(() => { firstFieldRef.current?.focus?.(); }, [activeTab]);

  const setValue = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const buildPayload = () => {
    const p = { ...form };
    if (!p.endDatum) delete p.endDatum;
    p.fai = !!p.fai; p.qs = !!p.qs;
    return p;
  };

  const submit = async () => {
    if (!form.bezeichnung.trim()) { setErrorMsg("Bezeichnung ist ein Pflichtfeld."); setActiveTab("details"); return; }
    setBusy(true); setErrorMsg(null);
    try {
      await axios.patch(`${API_BASE_URL}/${form.id}`, buildPayload(), { headers: { "Content-Type": "application/json" } });
      toast.success("Änderungen gespeichert");
      onSave?.(buildPayload());
      onClose?.();
    } catch (err) {
      const msg = apiErrorMessage(err) || "Speichern fehlgeschlagen.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Aufgabe wirklich löschen?")) return;
    setBusy(true);
    try {
      await axios.delete(`${API_BASE_URL}/${form.id}`);
      toast.success("Aufgabe gelöscht");
      onDeleted?.(form.id);
      onClose?.();
    } catch (err) {
      toast.error(apiErrorMessage(err) || "Löschen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  if (!task?.id) return null;

  return (
    <div style={UI.overlay} onClick={onClose}>
      <div style={UI.modal} onClick={(e) => e.stopPropagation()}>
        <div style={UI.header}>
          <h2 style={UI.title}>Aufgabe bearbeiten · #{form.id}</h2>
          <button style={{ ...UI.btn.base, ...UI.btn.secondary }} onClick={onClose}>Schließen</button>
        </div>

        <div style={UI.body}>
          {/* Tabs */}
          <div style={UI.tabs.header} role="tablist" aria-label="Bearbeiten">
            <button role="tab" aria-selected={activeTab === "details"} style={UI.tabs.tab(activeTab === "details")} onClick={() => setActiveTab("details")}>Details</button>
            <button role="tab" aria-selected={activeTab === "attachments"} style={UI.tabs.tab(activeTab === "attachments")} onClick={() => setActiveTab("attachments")}>Anhänge</button>
          </div>

          {errorMsg && (
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "#3b2323", color: "#ffd7d7", border: "1px solid #5f2a2a", borderRadius: 10 }}>
              🚨 {errorMsg}
            </div>
          )}

          {/* Tab Inhalt */}
          {activeTab === "details" && (
            <div>
              <div style={UI.section}>
                <h3 style={UI.sectionTitle}>Basisdaten & Zuordnung</h3>
                <label style={UI.label} htmlFor="bezeichnung">Bezeichnung *</label>
                <input ref={firstFieldRef} id="bezeichnung" style={UI.input} value={form.bezeichnung} onChange={(e) => setValue("bezeichnung", e.target.value)} disabled={busy} />

                <div style={{ height: 10 }} />

                <div style={UI.grid2}>
                  <div>
                    <label style={UI.label} htmlFor="teilenummer">Teilenummer</label>
                    <input id="teilenummer" style={UI.input} value={form.teilenummer} onChange={(e) => setValue("teilenummer", e.target.value)} disabled={busy} />
                  </div>
                  <div>
                    <label style={UI.label} htmlFor="kunde">Kunde</label>
                    <input id="kunde" style={UI.input} value={form.kunde} onChange={(e) => setValue("kunde", e.target.value)} disabled={busy} />
                  </div>
                  <div>
                    <label style={UI.label} htmlFor="endDatum">Enddatum</label>
                    <input id="endDatum" type="date" style={UI.input} value={form.endDatum} onChange={(e) => setValue("endDatum", e.target.value)} disabled={busy} />
                  </div>
                  <div>
                    <label style={UI.label} htmlFor="aufwandStunden">Aufwand (Std.)</label>
                    <input id="aufwandStunden" type="number" min="0" step="0.25" style={UI.input} value={form.aufwandStunden} onChange={(e) => setValue("aufwandStunden", Number(e.target.value))} disabled={busy} />
                  </div>
                  <div>
                    <label style={UI.label} htmlFor="stk">Stk</label>
                    <input id="stk" type="number" min="0" step="1" style={UI.input} value={form.stk} onChange={(e) => setValue("stk", Number(e.target.value))} disabled={busy} />
                  </div>
                  <div>
                    <label style={UI.label} htmlFor="fa">FA (Fertigungsauftrag-Nr.)</label>
                    <input id="fa" style={UI.input} value={form.fa} onChange={(e) => setValue("fa", e.target.value)} disabled={busy} />
                  </div>
                  <div>
                    <label style={UI.label} htmlFor="zust">Zuständigkeit</label>
                    <input id="zust" style={UI.input} value={form.zuständig} onChange={(e) => setValue("zuständig", e.target.value)} disabled={busy} />
                  </div>
                  <div>
                    <label style={UI.label} htmlFor="station">Arbeitsstation</label>
                    <select id="station" style={UI.input} value={form.arbeitsstation} onChange={(e) => setValue("arbeitsstation", e.target.value)} disabled={busy}>
                      {stations.map((s) => (<option key={s.id ?? s.name} value={s.name}>{s.name}</option>))}
                    </select>
                  </div>
                </div>

                <div style={{ height: 10 }} />

                <label style={UI.label}>Status & Zusatzarbeiten</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {STATUSES.map((s) => {
                    const key = statusKey(s);
                    const selected = form.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`pill st-${key.toLowerCase()} ${selected ? "is-selected" : ""}`}
                        onClick={() => setValue("status", s)}
                        disabled={busy}
                        aria-pressed={selected}
                        title={s}
                      >
                        {s}
                      </button>
                    );
                  })}
                  <div style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
                    <button type="button" className={`pill-add add-fai ${form.fai ? "is-active" : ""} is-clickable`} onClick={() => setValue("fai", !form.fai)} disabled={busy}>FAI</button>
                    <button type="button" className={`pill-add add-qs ${form.qs ? "is-active" : ""} is-clickable`} onClick={() => setValue("qs", !form.qs)} disabled={busy}>QS</button>
                  </div>
                </div>
              </div>

              <div style={UI.section}>
                <h3 style={UI.sectionTitle}>Beschreibung</h3>
                <label style={UI.label} htmlFor="dateipfad">Dateipfad</label>
                <input id="dateipfad" style={UI.input} value={form.dateipfad} onChange={(e) => setValue("dateipfad", e.target.value)} disabled={busy} />
                <div style={{ height: 10 }} />
                <label style={UI.label} htmlFor="infos">Zusätzliche Infos</label>
                <textarea id="infos" style={{ ...UI.input, ...UI.textarea }} value={form.zusätzlicheInfos} onChange={(e) => setValue("zusätzlicheInfos", e.target.value)} disabled={busy} />
              </div>
            </div>
          )}

          {activeTab === "attachments" && (
            <div style={UI.section}>
              <h3 style={UI.sectionTitle}>Anhänge</h3>
              <AttachmentTab taskId={form.id} toast={toast} />
            </div>
          )}
        </div>

        <div style={UI.footer}>
          <button type="button" style={{ ...UI.btn.base, ...UI.btn.danger }} onClick={remove} disabled={busy}>🗑 Löschen</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={{ ...UI.btn.base, ...UI.btn.secondary }} onClick={onClose} disabled={busy}>Abbrechen</button>
            <button type="button" style={{ ...UI.btn.base, ...UI.btn.primary }} onClick={submit} disabled={busy}>{busy ? "Speichern…" : "Speichern"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
