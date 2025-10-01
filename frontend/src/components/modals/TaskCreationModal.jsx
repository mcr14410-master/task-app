// src/components/modals/TaskCreationModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const stationNamesFrom = (stations) => {
  if (!Array.isArray(stations)) return [];
  return stations
    .map((s) =>
      typeof s === "string"
        ? s
        : s?.name ?? s?.bezeichnung ?? s?.title ?? s?.titel ?? ""
    )
    .filter(Boolean);
};

const STATUS_COLORS = {
  NEU: "#6366f1",
  TO_DO: "#f59e0b",
  IN_PROGRESS: "#22c55e",
  DONE: "#10b981",
  GESPERRT: "#ef4444", // neu
};
const STATUS_ORDER = ["NEU", "TO_DO", "IN_PROGRESS", "DONE", "GESPERRT"];

const DENSE = true;
const MODAL_DUR_MS = 260;

const styles = {
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
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
    marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #233145",
  },
  titleRow: { display: "flex", alignItems: "baseline", gap: 10 },
  title: { margin: 0, fontSize: "1.08rem", color: "#93c5fd", letterSpacing: ".2px" },
  newBadge: {
    padding: "2px 8px", borderRadius: 999, border: "1px solid #1e3a8a",
    background: "linear-gradient(180deg,#0f172a,#0b1220)", color: "#dbeafe",
    fontSize: ".82rem", display: "inline-flex", alignItems: "center", gap: 6,
    boxShadow: "0 0 0 2px rgba(59,130,246,.15), 0 0 12px rgba(59,130,246,.25)",
  },
  closeBtn: { background: "transparent", border: 0, color: "#9ca3af", fontSize: 20, cursor: "pointer", padding: 4, borderRadius: 8 },
  section: {
    background: "linear-gradient(180deg,#0b1220,#0f172a)", border: "1px solid #1f2937",
    padding: DENSE ? 10 : 12, borderRadius: 10, marginBottom: DENSE ? 8 : 10
  },
  sectionTitle: {
    margin: "0 0 8px 0", fontSize: "0.78rem", color: "#94a3b8",
    borderBottom: "1px dashed #233145", paddingBottom: 5, textTransform: "uppercase", fontWeight: 700, letterSpacing: ".06em"
  },
  label: { display: "block", marginBottom: 5, fontWeight: 700, color: "#d1d5db", fontSize: ".88rem" },
  inputBase: {
    width: "100%", padding: DENSE ? "7px 9px" : "8px 10px", border: "1px solid #243146", borderRadius: 9,
    background: "linear-gradient(180deg,#0f172a,#0b1220)", color: "#e5e7eb", fontSize: ".92rem",
    outline: "none", boxSizing: "border-box", transition: "border-color .12s ease, box-shadow .12s ease",
  },
  inputFocus: { borderColor: "#3b82f6", boxShadow: "0 0 0 3px rgba(59,130,246,.18)" },
  textarea: { minHeight: 88, resize: "vertical" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: DENSE ? 10 : 12 },
  footer: {
    marginTop: DENSE ? 8 : 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
    paddingTop: DENSE ? 8 : 10, borderTop: "1px solid #233145"
  },
  btnPrimary: { padding: DENSE ? "8px 14px" : "9px 16px", background: "linear-gradient(180deg,#2563eb,#1d4ed8)", color: "#fff", border: "1px solid #1e3a8a", borderRadius: 9, cursor: "pointer", fontWeight: 800 },
  btnSecondary: { padding: DENSE ? "8px 14px" : "9px 16px", background: "linear-gradient(180deg,#111827,#0b1220)", color: "#e5e7eb", border: "1px solid #233145", borderRadius: 9, cursor: "pointer", fontWeight: 700 },
  btnGhost: { padding: DENSE ? "8px 12px" : "9px 12px", background: "transparent", color: "#93c5fd", border: "1px dashed #1e3a8a", borderRadius: 9, cursor: "pointer", fontWeight: 700 },
  statusRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  pill: (active, color) => ({
    padding: DENSE ? "4px 8px" : "5px 9px", borderRadius: 999, fontSize: ".76rem", fontWeight: 800, cursor: "pointer",
    userSelect: "none", background: active ? color : "#334155", color: "#fff",
    border: `1px solid ${active ? "#fff" : "#1f2937"}`, boxShadow: active ? "0 0 0 3px rgba(255,255,255,.12)" : "none",
    transition: "transform .08s ease", transform: active ? "scale(1.02)" : "scale(1.0)",
  }),
  errorBox: { marginBottom: 10, padding: "9px 11px", backgroundColor: "#4f2b2b", color: "#ffdcdc", border: "1px solid #7f1d1d", borderRadius: 9, fontSize: ".9rem" },
};

const makeDefaultForm = () => ({
  bezeichnung: "", teilenummer: "", kunde: "", endDatum: "",
  aufwandStunden: 0, zuständig: "", zusätzlicheInfos: "",
  arbeitsstation: "Unassigned", status: "NEU",
});

function TaskCreationModal({ isOpen, stations = [], onCreated, onClose }) {
  const [focusKey, setFocusKey] = useState(null);
  const [shake, setShake] = useState(false);
  const modalRef = useRef(null);
  const formRef = useRef(null);
  const resetOnNextOpenRef = useRef(true);
  const titleId = "create-modal-title"; // <-- wird unten benutzt

  const stationNames = useMemo(() => {
    const names = stationNamesFrom(stations);
    const hasUn = names.some((n) => String(n).trim().toLowerCase() === "unassigned");
    const rest = names.filter((n) => String(n).trim().toLowerCase() !== "unassigned");
    return ["Unassigned", ...(hasUn ? rest : rest)];
  }, [stations]);

  const [form, setForm] = useState(makeDefaultForm());
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => { setForm((f) => ({ ...f, arbeitsstation: "Unassigned" })); }, [stationNames.length]);

  useEffect(() => {
    if (!isOpen) return;
    if (resetOnNextOpenRef.current) {
      setForm(makeDefaultForm());
      setErrorMsg(null);
      resetOnNextOpenRef.current = false;
      setTimeout(() => modalRef.current?.querySelector("#bezeichnung")?.focus(), 0);
    }
  }, [isOpen]);

  const setValue = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
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
      arbeitsstation: "Unassigned",
      status: sanitize(form.status) ?? "NEU",
      prioritaet: 9999,
    };
    Object.keys(payload).forEach((k) => payload[k] === null && delete payload[k]);
    return payload;
  };

  const validate = () => (!form.bezeichnung?.trim() ? "Bezeichnung ist ein Pflichtfeld." : null);

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    setErrorMsg(null);
    const v = validate();
    if (v) { setErrorMsg(v); return; }
    const payload = buildPayload();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      const saved = await res.json().catch(() => payload);
      onCreated?.(saved);
      resetOnNextOpenRef.current = true;
      onClose?.();
    } catch (err) {
      setErrorMsg(err?.message || "Unbekannter Fehler beim Erstellen.");
    } finally { setSubmitting(false); }
  };

  const handleCreateAndNew = async (e) => {
    e?.preventDefault?.();
    setErrorMsg(null);
    const v = validate();
    if (v) { setErrorMsg(v); return; }
    const payload = buildPayload();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      const saved = await res.json().catch(() => payload);
      onCreated?.(saved);
      setForm(makeDefaultForm());
      setTimeout(() => modalRef.current?.querySelector("#bezeichnung")?.focus(), 0);
    } catch (err) {
      setErrorMsg(err?.message || "Unbekannter Fehler beim Erstellen.");
    } finally { setSubmitting(false); }
  };

  const handleReset = (e) => {
    e?.preventDefault?.();
    setForm(makeDefaultForm());
    setErrorMsg(null);
    setTimeout(() => modalRef.current?.querySelector("#bezeichnung")?.focus(), 0);
  };

  const inputStyle = (key) => (focusKey === key ? { ...styles.inputBase, ...styles.inputFocus } : styles.inputBase);

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
      setErrorMsg(v);
      setShake(true);
      modalRef.current?.querySelector("#bezeichnung")?.focus();
      setTimeout(() => setShake(false), 220);
    }
  };

  if (!isOpen) return null;
  const baseAnim = "modalScaleIn var(--modal-dur,220ms) cubic-bezier(.22,.9,.24,1) both";
  const anim = shake ? `${baseAnim}, modalShake 220ms cubic-bezier(.36,.07,.19,.97)` : baseAnim;

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <style>{`
        :root { --modal-dur: ${MODAL_DUR_MS}ms; }
        @keyframes modalOverlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalScaleIn { from { opacity: 0; transform: translateY(6px) scale(.985) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes modalShake { 10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)} }
        @media (prefers-reduced-motion: reduce) { [style*="modalOverlayIn"], [style*="modalScaleIn"], [style*="modalShake"] { animation: none !important; } }
      `}</style>
      <div
        style={{ ...styles.modalBase, animation: anim }}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}      // <-- benutzt titleId
        tabIndex={-1}
      >
        <div style={styles.container}>
          <div style={styles.header}>
            <div style={styles.titleRow}>
              <h2 id={titleId} style={styles.title}>Neue Aufgabe</h2> {/* <-- benutzt titleId */}
              <span style={styles.newBadge}><span aria-hidden>✨</span><span>Neu</span></span>
            </div>
            <button style={styles.closeBtn} onClick={() => { onClose?.(); resetOnNextOpenRef.current = true; }} aria-label="Schließen">×</button>
          </div>

          {errorMsg && <div style={styles.errorBox}>🚨 {errorMsg}</div>}

          <form ref={formRef} onSubmit={handleCreate}>
            {/* Basisdaten */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Basisdaten</h3>

              <label style={styles.label} htmlFor="bezeichnung">Bezeichnung *</label>
              <input
                id="bezeichnung" type="text" style={inputStyle("bezeichnung")}
                value={form.bezeichnung} onFocus={() => setFocusKey("bezeichnung")} onBlur={() => setFocusKey(null)}
                onChange={(e) => setValue("bezeichnung", e.target.value)} disabled={submitting} required
              />

              <div style={{ height: DENSE ? 6 : 8 }} />
              <div style={styles.grid2}>
                <div>
                  <label style={styles.label} htmlFor="teilenummer">Teilenummer</label>
                  <input id="teilenummer" type="text" style={inputStyle("teilenummer")}
                    value={form.teilenummer} onFocus={() => setFocusKey("teilenummer")} onBlur={() => setFocusKey(null)}
                    onChange={(e) => setValue("teilenummer", e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <label style={styles.label} htmlFor="kunde">Kunde</label>
                  <input id="kunde" type="text" style={inputStyle("kunde")}
                    value={form.kunde} onFocus={() => setFocusKey("kunde")} onBlur={() => setFocusKey(null)}
                    onChange={(e) => setValue("kunde", e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <label style={styles.label} htmlFor="endDatum">Enddatum</label>
                  <input id="endDatum" type="date" style={inputStyle("endDatum")}
                    value={form.endDatum} onFocus={() => setFocusKey("endDatum")} onBlur={() => setFocusKey(null)}
                    onChange={(e) => setValue("endDatum", e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <label style={styles.label} htmlFor="aufwandStunden">Aufwand (Std.)</label>
                  <input id="aufwandStunden" type="number" min="0" step="0.25" style={inputStyle("aufwandStunden")}
                    value={form.aufwandStunden} onFocus={() => setFocusKey("aufwandStunden")} onBlur={() => setFocusKey(null)}
                    onChange={(e) => setValue("aufwandStunden", e.target.value)} disabled={submitting} />
                </div>
              </div>
            </div>

            {/* Zuweisung & Status */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Zuweisung & Status</h3>
              <div style={styles.grid2}>
                <div>
                  <label style={styles.label} htmlFor="zuständig">Zuständigkeit</label>
                  <input id="zuständig" type="text" style={inputStyle("zuständig")}
                    value={form.zuständig} onFocus={() => setFocusKey("zuständig")} onBlur={() => setFocusKey(null)}
                    onChange={(e) => setValue("zuständig", e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <label style={styles.label} htmlFor="arbeitsstation">Arbeitsstation</label>
                  <select id="arbeitsstation" style={inputStyle("arbeitsstation")}
                    value={form.arbeitsstation} onFocus={() => setFocusKey("arbeitsstation")} onBlur={() => setFocusKey(null)}
                    onChange={(e) => setValue("arbeitsstation", e.target.value)} disabled={submitting}>
                    {stationNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                  </select>
                </div>
              </div>

              <div style={{ height: DENSE ? 6 : 8 }} />
              <div>
                <label style={styles.label}>Status</label>
                <div style={styles.statusRow}>
                  {STATUS_ORDER.map((key) => (
                    <button key={key} type="button"
                      onClick={() => setValue("status", key)}
                      style={styles.pill(form.status === key, STATUS_COLORS[key])}
                      disabled={submitting} title={key}>
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Beschreibung */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Beschreibung</h3>
              <label style={styles.label} htmlFor="zusätzlicheInfos">Zusätzliche Infos</label>
              <textarea id="zusätzlicheInfos" style={{ ...styles.inputBase, minHeight: 88, resize: "vertical" }}
                value={form.zusätzlicheInfos} onFocus={() => setFocusKey("zusätzlicheInfos")} onBlur={() => setFocusKey(null)}
                onChange={(e) => setValue("zusätzlicheInfos", e.target.value)} disabled={submitting} placeholder="Optional: Kurzbeschreibung" />
            </div>

            <div style={styles.footer}>
              <button type="button" style={styles.btnGhost} onClick={handleReset} disabled={submitting} title="Formular zurücksetzen">
                ↺ Zurücksetzen
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={styles.btnSecondary} onClick={() => { onClose?.(); resetOnNextOpenRef.current = true; }} disabled={submitting}>Abbrechen</button>
                <button type="button" style={styles.btnPrimary} onClick={handleCreateAndNew} disabled={submitting}>
                  {submitting ? "Speichere…" : "Speichern & Neu"}
                </button>
                <button type="submit" style={styles.btnPrimary} disabled={submitting}>
                  {submitting ? "Speichere…" : "Erstellen"}
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}

export default React.memo(TaskCreationModal);
