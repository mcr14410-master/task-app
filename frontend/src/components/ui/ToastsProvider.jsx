import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { ToastCtx } from "./toastContext";

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]); // {id,type,title?,message?,ttl,actions?}
  const idRef = useRef(1);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const add = useCallback((type, message, { title, ttl = 4000, actions = [] } = {}) => {
    const id = idRef.current++;
    setToasts((list) => [...list, { id, type, title, message, ttl, actions }]);
    return id;
  }, []);

  const api = useMemo(() => ({
    show: (type, message, opts) => add(type, message, opts),
    info: (msg, opt) => add("info", msg, opt),
    success: (msg, opt) => add("success", msg, opt),
    error: (msg, opt) => add("error", msg, opt),
    remove,
  }), [add, remove]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onClose={remove} />
    </ToastCtx.Provider>
  );
}

function Icon({ type }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2 };
  if (type === "success") return <svg {...common} stroke="#22c55e"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (type === "error")   return <svg {...common} stroke="#ef4444"><path d="M12 9v4m0 4h.01M10 3.5l-8.5 15h17L10 3.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg {...common} stroke="#60a5fa"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h2v5h-2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ToastViewport({ toasts, onClose }) {
  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => onClose(t.id), t.ttl ?? 4000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, onClose]);

  return (
    <>
      <style>{`
        .toast-enter { animation: toast-in .22s ease-out both; }
        @keyframes toast-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toast-progress { from { width: 100%; } to { width: 0%; } }
      `}</style>
      <div style={styles.viewport} aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className="toast-enter" role="status" style={{ ...styles.toast, ...variantStyle(t.type) }}>
            <div style={styles.toastHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon type={t.type} />
                <strong style={{ fontSize: 13, color: "#e5e7eb" }}>
                  {t.title ?? (t.type === "success" ? "Erfolg" : t.type === "error" ? "Fehler" : "Hinweis")}
                </strong>
              </div>
              <button onClick={() => onClose(t.id)} style={styles.closeBtn} aria-label="Toast schließen">×</button>
            </div>

            {t.message && <div style={styles.toastBody}>{t.message}</div>}

            {Array.isArray(t.actions) && t.actions.length > 0 && (
              <div style={styles.actions}>
                {t.actions.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => { onClose(t.id); a.onClick?.(); }}
                    style={a.variant === "primary" ? styles.actionPrimary : styles.actionGhost}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressBar,
                  animation: `toast-progress ${t.ttl ?? 4000}ms linear forwards`,
                  background: barColor(t.type),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function barColor(type) {
  if (type === "success") return "#22c55e";
  if (type === "error") return "#ef4444";
  return "#3b82f6";
}
function variantStyle(type) {
  const left = type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : "#60a5fa";
  return { borderLeft: `4px solid ${left}` };
}

const styles = {
  viewport: { position: "fixed", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 8, zIndex: 1000, maxWidth: 380 },
  toast: {
    background: "#0f172a",
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    padding: 10,
    border: "1px solid #1f2937",
  },
  toastHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  toastBody: { fontSize: 13, color: "#cbd5e1", lineHeight: 1.35 },
  closeBtn: { border: "none", background: "transparent", fontSize: 18, lineHeight: 1, cursor: "pointer", color: "#94a3b8" },
  actions: { display: "flex", gap: 8, marginTop: 8 },
  actionGhost: { padding: "6px 10px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#cbd5e1", fontSize: 12 },
  actionPrimary: { padding: "6px 10px", borderRadius: 8, border: "1px solid #3b82f6", background: "#3b82f6", color: "#fff", fontSize: 12 },
  progressTrack: { marginTop: 8, height: 3, background: "#0b1220", borderRadius: 999 },
  progressBar: { height: 3, width: "100%", borderRadius: 999 },
};
