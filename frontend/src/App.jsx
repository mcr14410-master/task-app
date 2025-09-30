import React from "react";
import ToastProvider from "./components/ui/ToastsProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import BoardCleanDnD from "./components/BoardCleanDnD";

export default function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <BoardCleanDnD />
      </ErrorBoundary>
    </ToastProvider>
  );
}
