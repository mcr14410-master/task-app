import React, { useEffect, useState } from "react";
import ToastProvider from "./components/ui/ToastsProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import TaskBoard from "@/components/TaskBoard";
import Dashboard from "@/components/dashboard/Dashboard";

// NEU: Utility importieren
import { injectDueStyles, setupDueSettingsAutoReload } from "./utils/dueStyles";

export default function App() {
  // Board/Dashboard Umschalter
  const [showDashboard, setShowDashboard] = useState(false);
  const handleToggleView = () => setShowDashboard((prev) => !prev);

  // Beim Start Buckets laden & CSS injizieren
  useEffect(() => {
    let cleanup;
    (async () => {
      await injectDueStyles();
      // Optionales Live-Reload der Styles, falls Settings gespeichert werden
      cleanup = setupDueSettingsAutoReload();
    })();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <ToastProvider>
      <ErrorBoundary>
        {showDashboard ? (
          <Dashboard
            showDashboard={showDashboard}
            onToggleDashboard={handleToggleView}
          />
        ) : (
          <TaskBoard
            showDashboard={showDashboard}
            onToggleDashboard={handleToggleView}
          />
        )}
      </ErrorBoundary>
    </ToastProvider>
  );
}
