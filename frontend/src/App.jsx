import React from "react";
import ToastProvider from "./components/ui/ToastsProvider";
import BoardCleanDnD from "./components/BoardCleanDnD";

export default function App() {
  return (
    <ToastProvider>
      <BoardCleanDnD />
    </ToastProvider>
  );
}
