import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // optional: Log an Endpoint senden
    console.error("UI ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h2>Uups – da ist etwas schiefgelaufen.</h2>
          <p style={{ color: "#6b7280" }}>Bitte neu laden. Wenn der Fehler bleibt, melde dich mit einer kurzen Beschreibung.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => window.location.reload()} style={btnPrimary}>Neu laden</button>
            <button onClick={() => this.setState({ hasError: false, error: null })} style={btnGhost}>Weiter versuchen</button>
          </div>
          <pre style={{ marginTop: 12, background: "#f9fafb", padding: 8, borderRadius: 8, color: "#ef4444", whiteSpace: "pre-wrap" }}>
            {String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const btnPrimary = { padding: "8px 12px", borderRadius: 6, border: "1px solid #2563eb", background: "#2563eb", color: "#fff" };
const btnGhost = { padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff" };
