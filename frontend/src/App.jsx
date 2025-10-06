import React from "react";
import ToastProvider from "./components/ui/ToastsProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import TaskBoard from "@/components/TaskBoard";


export default function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <TaskBoard />
      </ErrorBoundary>
    </ToastProvider>
  );
}
