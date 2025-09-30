import React, { useEffect, useRef, useState } from "react";
import useToast from "../ui/useToast";

function toYMD(val) {
  if (!val) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function TaskCreationModal({ isOpen, onClose, stations = [], onCreated }) {
  const [bezeichnung, setBezeichnung] = useState("");
  const [info, setInfo] = useState("");
  const [endDatum, setEndDatum] = useState("");
  const [arbeitsstation, setArbeitsstation] = useState(stations[0] || "Unassigned");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setBezeichnung(""); setInfo(""); setEndDatum("");
    setArbeitsstation(stations[0] || "Unassigned"); setSaving(false);
    setTimeout(() => firstInputRef.current?.focus(), 0);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, stations, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bezeichnung.trim()) return;
    const payload = {
      bezeichnung: bezeichnung.trim(),
      ["zusätzlicheInfos"]: info.trim() || null,
      endDatum: endDatum || null,
      arbeitsstation,
      prioritaet: 9999,
    };

    try {
      setSaving(true);
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      let saved; try { saved = await res.json(); } catch { saved = payload; }
      onCreated?.(saved); onClose();
    } catch (err) {
      toast.error("Erstellen fehlgeschlagen.", { title: "Fehler" }); console.error(err);
    } finally { setSaving(false); }
  };

  return (
    <div style={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>Neue Aufgabe</h3>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
          <label style={styles.label}>
            Bezeichnung*
            <input ref={firstInputRef} style={styles.input} value={bezeichnung} onChange={(e) => setBezeichnung(e.target.value)} required />
          </label>

          <label style={styles.label}>
            Zusätzliche Infos
            <textarea style={{ ...styles.input, minHeight: 70 }} value={info} onChange={(e) => setInfo(e.target.value)} />
          </label>

          <label style={styles.label}>
            Fällig am
            <input type="date" style={styles.input} value={toYMD(endDatum)} onChange={(e) => setEndDatum(e.target.value)} />
          </label>

          <label style={styles.label}>
            Arbeitsstation
            <select style={styles.input} value={arbeitsstation} onChange={(e) => setArbeitsstation(e.target.value)}>
              {stations.map((s) => (<option key={s} value={s}>{s}</option>))}
              {!stations.length && <option value="Unassigned">Unassigned</option>}
            </select>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={styles.btnGhost}>Abbrechen (Esc)</button>
            <button type="submit" disabled={saving} style={styles.btnPrimary}>{saving ? "Erstelle…" : "Erstellen"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(2,6,23,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { width: 460, maxWidth: "90vw", background: "#0f172a", border: "1px solid #1f2937", borderRadius: 12, padding: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" },
  title: { margin: "0 0 8px 0", color: "#e5e7eb" },
  label: { display: "grid", gap: 4, fontSize: 13, color: "#cbd5e1" },
  input: { padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb" },
  btnGhost: { padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#e5e7eb" },
  btnPrimary: { padding: "8px 12px", borderRadius: 8, border: "1px solid #3b82f6", background: "#3b82f6", color: "#fff" },
};
