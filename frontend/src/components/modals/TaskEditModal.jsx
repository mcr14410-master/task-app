// src/components/modals/TaskEditModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const stationNamesFrom = (stations) => {
  if (!Array.isArray(stations)) return [];
  return stations
    .map((s) =>
      typeof s === "string" ? s : s?.name ?? s?.bezeichnung ?? s?.title ?? s?.titel ?? ""
    )
    .filter(Boolean);
};

const STATUSES = ["NEU", "TO_DO", "IN_PROGRESS", "DONE", "GESPERRT"];
const getStatusColor = (status) => {
  switch (status) {
    case "NEU": return "#6366f1";
    case "TO_DO": return "#f59e0b";
    case "IN_PROGRESS": return "#22c55e";
    case "DONE": return "#10b981";
    case "GESPERRT": return "#ef4444";
    default: return "#64748b";
  }
};
const toInputDate = (d) => {
  if (!d) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, "0"), day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch { return ""; }
};

const DENSE = true;
const MODAL_DUR_MS = 260;

const ui = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(3,10,22,0.65)", backdropFilter: "blur(6px)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 16,
    animation: "modalOverlayIn var(--modal-dur,220ms) ease-out both",
  },
  modalBase: {
    background: "linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(15,23,42,0.98) 100%)",
    color: "#e5e7eb", border: "1px solid #1f2937", borderRadius: 12,
    width: 640, maxWidth: "100%", maxHeight: "85vh", overflowY: "auto",
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
  },
  container: { padding: DENSE ? "18px 20px" : "20px 22px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #233145" },
  titleRow: { display: "flex", alignItems: "baseline", gap: 10 },
  title: { fontSize: "1.08rem", color: "#93c5fd", margin: 0, letterSpacing: ".2px" },
  idBadge: { padding: "2px 8px", borderRadius: 999, border: "1px solid #1e3a8a", background: "linear-gradient(180deg,#0f172a,#0b1220)", color: "#dbeafe", fontSize: ".82rem", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 0 0 2px rgba(59,130,246,.15), 0 0 12px rgba(59,130,246,.25)" },
  idMono: { fontVariantNumeric: "tabular-nums", letterSpacing: ".02em" },
  close: { background: "transparent", border: 0, color: "#9ca3af", fontSize: 20, cursor: "pointer", padding: 4, borderRadius: 8 },

  section: { background: "linear-gradient(180deg,#0b1220,#0f172a)", border: "1px solid #1f2937", padding: DENSE ? 10 : 12, borderRadius: 10, marginBottom: DENSE ? 8 : 10 },
  sectionTitle: { margin: "0 0 8px 0", fontSize: "0.78rem", color: "#94a3b8", borderBottom: "1px dashed #233145", paddingBottom: 5, textTransform: "uppercase", fontWeight: 700, letterSpacing: ".06em" },

  label: { display: "block", marginBottom: 5, fontWeight: 700, color: "#d1d5db", fontSize: ".88rem" },
  inputBase: { width: "100%", padding: DENSE ? "7px 9px" : "8px 10px", border: "1px solid #243146", borderRadius: 9, background: "linear-gradient(180deg,#0f172a,#0b1220)", color: "#e5e7eb", fontSize: ".92rem", outline: "none", boxSizing: "border-box", transition: "border-color .12s ease, box-shadow .12s ease" },
  inputFocus: { borderColor: "#3b82f6", boxShadow: "0 0 0 3px rgba(59,130,246,.18)" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: DENSE ? 10 : 12 },
  textarea: { minHeight: 86, resize: "vertical" },

  footer: { marginTop: DENSE ? 8 : 10, display: "flex", justifyContent: "space-between", gap: 8, paddingTop: DENSE ? 8 : 10, borderTop: "1px solid #233145" },
  ghost: { padding: DENSE ? "8px 12px" : "9px 12px", background: "transparent", color: "#93c5fd", border: "1px dashed #1e3a8a", borderRadius: 9, cursor: "pointer", fontWeight: 700 },
  danger: { padding: DENSE ? "8px 14px" : "9px 16px", background: "linear-gradient(180deg,#dc2626,#b91c1c)", color: "#fff", border: "1px solid #7f1d1d", borderRadius: 9, cursor: "pointer", fontWeight: 800 },
  secondary: { padding: DENSE ? "8px 14px" : "9px 16px", background: "linear-gradient(180deg,#111827,#0b1220)", color: "#e5e7eb", border: "1px solid #233145", borderRadius: 9, cursor: "pointer", fontWeight: 700 },
  primary: { padding: DENSE ? "8px 14px" : "9px 16px", background: "linear-gradient(180deg,#22c55e,#16a34a)", color: "#fff", border: "1px solid #065f46", borderRadius: 9, cursor: "pointer", fontWeight: 800 },

  badgeRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 },
  badge: (bg, selected) => ({
    background: bg, color: "#fff", padding: DENSE ? "4px 8px" : "5px 9px", borderRadius: 999, fontSize: ".76rem", fontWeight: 800,
    border: `1px solid ${selected ? "#fff" : "#1f2937"}`, boxShadow: selected ? "0 0 0 3px rgba(255,255,255,.12)" : "none",
    cursor: "pointer", userSelect: "none",
  }),
};

function TaskEditModal({ isOpen, task, stations = [], onSaved, onClose, onRequestDelete }) {
  const [focusKey, setFocusKey] = useState(null);
  const [shake, setShake] = useState(false);
  const names = useMemo(() => stationNamesFrom(stations), [stations]);
  const modalRef = useRef(null);
  const formRef = useRef(null);
  const titleId = "edit-modal-title"; // <-- wird unten benutzt

  const [taskData, setTaskData] = useState({
    bezeichnung: "", teilenummer: "", kunde: "", endDatum: "",
    aufwandStunden: 0, zuständig: "", zusätzlicheInfos: "",
    arbeitsstation: "Unassigned", id: null, status: "NEU",
  });
  const initialTaskRef = useRef(taskData);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!task) return;
    const snapshot = {
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
    };
    setTaskData(snapshot);
    initialTaskRef.current = snapshot;
    setSubmitError(null);
  }, [task?.id, isOpen]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const newValue = type === "number" ? (value === "" ? 0 : parseFloat(value)) : value;
    setTaskData((prev) => ({ ...prev, [name]: newValue }));
  };
  const setStatus = (status) => setTaskData((p) => ({ ...p, status }));

  const validate = () => (!taskData.bezeichnung.trim() ? "Die Bezeichnung ist ein Pflichtfeld!" : null);

  const handleSave = async () => {
    const v = validate();
    if (v) { setSubmitError(v); return; }
    setIsSaving(true); setSubmitError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(taskData),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      const saved = await res.json().catch(() => taskData);
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setSubmitError(err?.message || "Unbekannter Fehler beim Speichern.");
      console.error(err);
    } finally { setIsSaving(false); }
  };

  const handleDelete = () => { onRequestDelete?.(task); onClose?.(); };
  const handleReset = () => {
    setTaskData(initialTaskRef.current);
    setSubmitError(null);
    setTimeout(() => modalRef.current?.querySelector("#bezeichnung")?.focus(), 0);
  };

  const inputStyle = (key) => (focusKey === key ? { ...ui.inputBase, ...ui.inputFocus } : ui.inputBase);

  useEffect(() => {
    if (!isOpen) return;
    const node = modalRef.current; if (!node) return;
    const firstInput = node.querySelector("#bezeichnung");
    setTimeout(() => { firstInput?.focus(); }, 0);
    const onKeyDown = (ev) => {
      if (ev.key === "Escape") { ev.preventDefault(); onClose?.(); return; }
      if ((ev.key === "Enter") && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); formRef.current?.requestSubmit(); return; }
    };
    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleOverlayClick = (ev) => {
    ev.stopPropagation();
    const v = validate();
    if (v) {
      setSubmitError(v);
      setShake(true);
      const bezeich = modalRef.current?.querySelector("#bezeichnung");
      bezeich?.focus();
      setTimeout(() => setShake(false), 220);
      return;
    }
    onClose?.();
  };

  if (!isOpen || !task?.id) return null;

  const baseAnim = "modalScaleIn var(--modal-dur,220ms) cubic-bezier(.22,.9,.24,1) both";
  const anim = shake ? `${baseAnim}, modalShake 220ms cubic-bezier(.36,.07,.19,.97)` : baseAnim;

  return (
    <div style={ui.overlay} onClick={handleOverlayClick}>
      <style>{`
        :root { --modal-dur: ${MODAL_DUR_MS}ms; }
        @keyframes modalOverlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalScaleIn { from { opacity: 0; transform: translateY(6px) scale(.985) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes modalShake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        @media (prefers-reduced-motion: reduce) { [style*="modalOverlayIn"], [style*="modalScaleIn"], [style*="modalShake"] { animation: none !important; } }
      `}</style>
      <div
        style={{ ...ui.modalBase, animation: anim }}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}   // <-- benutzt titleId
        tabIndex={-1}
      >
        <div style={ui.container}>
          <div style={ui.header}>
            <div style={ui.titleRow}>
              <h2 id={titleId} style={ui.title}>Aufgabe bearbeiten</h2> {/* <-- benutzt titleId */}
              <span style={ui.idBadge} title={`Task-ID ${task.id}`}>
                <span aria-hidden>✏️</span>
                <span style={ui.idMono}>#{task.id}</span>
              </span>
            </div>
            <button onClick={onClose} style={ui.close} aria-label="Schließen">×</button>
          </div>

          {submitError && <p style={{ color: "#fca5a5", marginTop: 0 }}>{submitError}</p>}

          <form ref={formRef} onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div style={ui.section}>
              <h3 style={ui.sectionTitle}>Basisdaten & Zuweisung</h3>

              <div>
                <label style={ui.label} htmlFor="bezeichnung">Bezeichnung *</label>
                <input
                  style={inputStyle("bezeichnung")} type="text" id="bezeichnung" name="bezeichnung"
                  value={taskData.bezeichnung} onFocus={() => setFocusKey("bezeichnung")} onBlur={() => setFocusKey(null)}
                  onChange={handleChange} required disabled={isSaving}
                />
              </div>

              <div style={{ height: DENSE ? 6 : 8 }} />

              <div style={ui.grid2}>
                <div>
                  <label style={ui.label} htmlFor="teilenummer">Teilenummer</label>
                  <input style={inputStyle("teilenummer")} type="text" id="teilenummer" name="teilenummer"
                    value={taskData.teilenummer} onFocus={() => setFocusKey("teilenummer")} onBlur={() => setFocusKey(null)}
                    onChange={handleChange} disabled={isSaving} />
                </div>

                <div>
                  <label style={ui.label} htmlFor="kunde">Kunde</label>
                  <input style={inputStyle("kunde")} type="text" id="kunde" name="kunde"
                    value={taskData.kunde} onFocus={() => setFocusKey("kunde")} onBlur={() => setFocusKey(null)}
                    onChange={handleChange} disabled={isSaving} />
                </div>

                <div>
                  <label style={ui.label} htmlFor="endDatum">Enddatum</label>
                  <input style={inputStyle("endDatum")} type="date" id="endDatum" name="endDatum"
                    value={taskData.endDatum} onFocus={() => setFocusKey("endDatum")} onBlur={() => setFocusKey(null)}
                    onChange={handleChange} disabled={isSaving} />
                </div>

                <div>
                  <label style={ui.label} htmlFor="aufwandStunden">Aufwand (Std.)</label>
                  <input style={inputStyle("aufwandStunden")} type="number" min="0" step="0.25" id="aufwandStunden" name="aufwandStunden"
                    value={taskData.aufwandStunden} onFocus={() => setFocusKey("aufwandStunden")} onBlur={() => setFocusKey(null)}
                    onChange={handleChange} disabled={isSaving} />
                </div>

                <div>
                  <label style={ui.label} htmlFor="zuständig">Zuständigkeit</label>
                  <input style={inputStyle("zuständig")} type="text" id="zuständig" name="zuständig"
                    value={taskData.zuständig} onFocus={() => setFocusKey("zuständig")} onBlur={() => setFocusKey(null)}
                    onChange={handleChange} disabled={isSaving} />
                </div>

                <div>
                  <label style={ui.label} htmlFor="arbeitsstation">Station</label>
                  <select style={inputStyle("arbeitsstation")} id="arbeitsstation" name="arbeitsstation"
                    value={taskData.arbeitsstation} onFocus={() => setFocusKey("arbeitsstation")} onBlur={() => setFocusKey(null)}
                    onChange={handleChange} disabled={isSaving}>
                    {["Unassigned", ...names.filter((n) => String(n).toLowerCase() !== "unassigned")].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ height: DENSE ? 6 : 8 }} />

              <div>
                <label style={ui.label}>Status</label>
                <div style={ui.badgeRow}>
                  {STATUSES.map((s) => {
                    const selected = taskData.status === s;
                    return (
                      <span
                        key={s} role="button" tabIndex={0} aria-pressed={selected}
                        onClick={() => setStatus(s)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setStatus(s)}
                        style={ui.badge(getStatusColor(s), selected)}
                      >
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
                style={{ ...inputStyle("zusätzlicheInfos"), ...ui.textarea }}
                id="zusätzlicheInfos" name="zusätzlicheInfos"
                value={taskData.zusätzlicheInfos}
                onFocus={() => setFocusKey("zusätzlicheInfos")}
                onBlur={() => setFocusKey(null)}
                onChange={handleChange}
                disabled={isSaving}
                placeholder="Kurzbeschreibung / Notizen"
              />
            </div>

            <div style={ui.footer}>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={ui.ghost} onClick={handleReset} disabled={isSaving} title="Änderungen verwerfen und zurücksetzen">↺ Zurücksetzen</button>
                <button type="button" style={ui.danger} onClick={onRequestDelete} disabled={isSaving} title="Aufgabe löschen (mit Undo im Board)">🗑 Löschen</button>
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
