import React, { useState } from "react";
import ToastProvider from "./components/ui/ToastsProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import TaskBoard from "@/components/TaskBoard";
import Dashboard from "@/components/Dashboard"; // NEU

export default function App() {
  // steuert, welche Ansicht sichtbar ist
  const [showDashboard, setShowDashboard] = useState(false);

  const handleToggleView = () => {
    setShowDashboard((prev) => !prev);
  };

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
