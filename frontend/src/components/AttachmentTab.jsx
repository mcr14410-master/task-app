import { useEffect, useState } from "react";
import { AttachmentsApi } from "../api/attachmentsApi";
import { formatBytes } from "../utils/bytes";

export default function AttachmentTab({ taskId, toast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);   // Daten laden / löschen / upload busy
  const [error, setError] = useState(null);        // sichtbarer Fehlerbanner

  async function load() {
    setLoading(true); setError(null);
    try {
      const data = await AttachmentsApi.list(taskId);
      setList(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (taskId) load(); }, [taskId]);

  async function onUpload(e) {
    const file = e.target.files?.[0]; // bewusst: nur ein File -> minimaler Eingriff
    if (!file) return;
    try {
      setLoading(true); setError(null);
      await AttachmentsApi.upload(taskId, file);
      toast?.success?.("Anhang hochgeladen");
      await load();
    } catch (err) {
      setError(err);
      toast?.error?.(err?.message || "Upload fehlgeschlagen");
    } finally {
      e.target.value = ""; // Input reset
      setLoading(false);
    }
  }

  async function onDelete(id) {
    try {
      setLoading(true); setError(null);
      await AttachmentsApi.remove(taskId, id);
      toast?.success?.("Anhang gelöscht");
      setList(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setError(err);
      toast?.error?.(err?.message || "Löschen fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Fehlerbanner (nur wenn nötig) */}
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 8,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #5c1f24",
            background: "#341a1c",
            color: "#ffb3b8"
          }}
        >
          {error?.message || "Unbekannter Fehler im Anhangsbereich."}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <input type="file" onChange={onUpload} disabled={loading} />
      </div>

      {loading ? (
        <div>lade…</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {list.map(a => (
            <li
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid #e5e7eb"
              }}
            >
              <span title={a.filename} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.filename}{" "}
                <small style={{ color: "#6b7280" }}>
                  ({formatBytes(a.size)})
                </small>
              </span>
              <span style={{ display: "flex", gap: 8 }}>
                <a href={a.downloadUrl} target="_blank" rel="noreferrer">Öffnen</a>
                <button onClick={() => onDelete(a.id)} disabled={loading}>Löschen</button>
              </span>
            </li>
          ))}
          {list.length === 0 && (
            <li style={{ color: "#64748b" }}>Keine Anhänge</li>
          )}
        </ul>
      )}
    </div>
  );
}
