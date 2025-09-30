// src/components/ui/Toasts.jsx
import React, { createContext, useContext, useMemo, useRef, useState, useCallback, useEffect } from "react";

const ToastCtx = createContext(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]); // {id, type, title?, message?, ttl}
  const idRef = useRef(1);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const add = useCallback((type, message, { title, ttl = 4000 } = {}) => {
    const id = idRef.current++;
    setToasts((list) => [...list, { id, type, title, message, ttl }]);
    return id;
  }, []);

  // helpers
  const api = useMemo(
    () => ({
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

function ToastViewport({ toasts, onClose }) {
  useEffect(() => {
    const timers = toasts.map((t) => {
      const id = setTimeout(() => onClose(t.id), t.ttl ?? 4000);
      return id;
    });
    return () => timers.forEach(clearTimeout);
  }, [toasts, onClose]);

  return (
    <div style={styles.viewport} aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} role="status" style={{ ...styles.toast, ...variantStyle(t.type) }}>
          <div style={styles.toastHeader}>
            <strong style={{ fontSize: 13 }}>
              {t.title ?? (t.type === "success" ? "Erfolg" : t.type === "error" ? "Fehler" : "Hinweis")}
            </strong>
            <button onClick={() => onClose(t.id)} style={styles.closeBtn} aria-label="Toast schließen">
              ×
            </button>
          </div>
          {t.message && <div style={styles.toastBody}>{t.message}</div>}
        </div>
      ))}
    </div>
  );
}

function variantStyle(type) {
  switch (type) {
    case "success":
      return { borderLeft: "4px solid #16a34a" };
    case "error":
      return { borderLeft: "4px solid #dc2626" };
    default:
      return { borderLeft: "4px solid #2563eb" };
  }
}

const styles = {
  viewport: {
    position: "fixed",
    top: 12,
    right: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    zIndex: 1000,
    maxWidth: 360,
  },
  toast: {
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    padding: 10,
    border: "1px solid #e5e7eb",
  },
  toastHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  toastBody: { fontSize: 13, color: "#374151", lineHeight: 1.35 },
  closeBtn: {
    border: "none",
    background: "transparent",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
    color: "#6b7280",
  },
};
