import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { ToastCtx } from "./toastContext";

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]); // {id,type,title?,message?,ttl,actions?}
  const idRef = useRef(1);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const add = useCallback((type, message, { title, ttl = 4000, actions = [] } = {}) => {
    const id = idRef.current++;
    setToasts((list) => [...list, { id, type, title, message, ttl, actions }]);
    return id;
  }, []);

  const api = useMemo(
    () => ({
      show: (type, message, opts) => add(type, message, opts),
      info: (msg, opt) => add("info", msg, opt),
      success: (msg, opt) => add("success", msg, opt),
      error: (msg, opt) => add("error", msg, opt),
      remove,
    }),
    [add, remove]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onClose={remove} />
    </ToastCtx.Provider>
  );
}

function Icon({ type }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2 };
  if (type === "success")
    return <svg {...common} stroke="#16a34a"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (type === "error")
    return <svg {...common} stroke="#dc2626"><path d="M12 9v4m0 4h.01M10 3.5l-8.5 15h17L10 3.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg {...common} stroke="#2563eb"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h2v5h-2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ToastViewport({ toasts, onClose }) {
  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => onClose(t.id), t.ttl ?? 4000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, onClose]);

  return (
    <>
      <style>{`
        @keyframes toast-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toast-progress { from { width: 100%; } to { width: 0%; } }
        .toast-enter { animation: toast-in .22s ease-out both; }
      `}</style>
      <div style={styles.viewport} aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className="toast-enter" role="status" style={{ ...styles.toast, ...variantStyle(t.type) }}>
            <div style={styles.toastHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon type={t.type} />
                <strong style={{ fontSize: 13 }}>
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

            {/* Progress-Bar */}
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
  if (type === "success") return "#16a34a";
  if (type === "error") return "#dc2626";
  return "#2563eb";
}

function variantStyle(type) {
  switch (type) {
    case "success": return { borderLeft: "4px solid #16a34a" };
    case "error":   return { borderLeft: "4px solid #dc2626" };
    default:        return { borderLeft: "4px solid #2563eb" };
  }
}

const styles = {
  viewport: { position: "fixed", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 8, zIndex: 1000, maxWidth: 380 },
  toast: { background: "#fff", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: 10, border: "1px solid #e5e7eb" },
  toastHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  toastBody: { fontSize: 13, color: "#374151", lineHeight: 1.35 },
  closeBtn: { border: "none", background: "transparent", fontSize: 18, lineHeight: 1, cursor: "pointer", color: "#6b7280" },
  actions: { display: "flex", gap: 8, marginTop: 8 },
  actionGhost: { padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 12 },
  actionPrimary: { padding: "6px 10px", borderRadius: 6, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontSize: 12 },
  progressTrack: { marginTop: 8, height: 3, background: "#f3f4f6", borderRadius: 999 },
  progressBar: { height: 3, width: "100%", borderRadius: 999 },
};
