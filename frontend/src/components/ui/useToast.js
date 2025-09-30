import { useContext } from "react";
import { ToastCtx } from "./toastContext";

export default function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
