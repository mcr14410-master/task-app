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

export default function TaskEditModal({ isOpen, onClose, task, stations = [], onSaved, onRequestDelete }) {
  const [bezeichnung, setBezeichnung] = useState("");
  const [info, setInfo] = useState("");
  const [endDatum, setEndDatum] = useState("");
  const [arbeitsstation, setArbeitsstation] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && task) {
      setBezeichnung(task?.bezeichnung ?? "");
      setInfo(task?.["zusätzlicheInfos"] ?? task?.zusatzlicheInfos ?? "");
      setEndDatum(toYMD(task?.endDatum));
      setArbeitsstation(task?.arbeitsstation ?? stations[0] ?? "Unassigned");
      setSaving(false); setDeleting(false);
      setTimeout(() => firstInputRef.current?.focus(), 0);
      const onKey = (e) => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [isOpen, task, stations, onClose]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...task,
      bezeichnung: bezeichnung.trim() || "(ohne Bezeichnung)",
      ["zusätzlicheInfos"]: info.trim() || null,
      endDatum: endDatum || null,
      arbeitsstation,
    };

    try {
      setSaving(true);
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      let saved; try { saved = await res.json(); } catch { saved = payload; }
      onSaved?.(saved); onClose();
    } catch (err) {
      toast.error("Speichern fehlgeschlagen.", { title: "Fehler" }); console.error(err);
    } finally { setSaving(false); }
  };

  const handleDelete = () => {
    if (deleting) return;
    const ok = window.confirm(`Aufgabe #${task.id} wirklich löschen?`);
    if (!ok) return;
    setDeleting(true);
    try { onRequestDelete?.(task); onClose(); } finally { setDeleting(false); }
  };

  return (
    <div style={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>Aufgabe bearbeiten #{task.id}</h3>
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

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
            <button type="button" onClick={handleDelete} disabled={saving || deleting} style={styles.btnDanger} title="Aufgabe löschen">
              {deleting ? "Lösche…" : "Löschen"}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={onClose} style={styles.btnGhost} disabled={saving || deleting}>Abbrechen (Esc)</button>
              <button type="submit" disabled={saving || deleting} style={styles.btnPrimary}>{saving ? "Speichere…" : "Speichern"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(2,6,23,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { width: 480, maxWidth: "90vw", background: "#0f172a", border: "1px solid #1f2937", borderRadius: 12, padding: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" },
  title: { margin: "0 0 8px 0", color: "#e5e7eb" },
  label: { display: "grid", gap: 4, fontSize: 13, color: "#cbd5e1" },
  input: { padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb" },
  btnGhost: { padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#e5e7eb" },
  btnPrimary: { padding: "8px 12px", borderRadius: 8, border: "1px solid #22c55e", background: "#22c55e", color: "#0b1220" },
  btnDanger: { padding: "8px 12px", borderRadius: 8, border: "1px solid #ef4444", background: "#ef4444", color: "#0b1220" },
};
