// src/utils/dueStyles.js

// Fallback-Defaults, falls API (noch) nicht erreichbar ist:
export const DEFAULT_BUCKETS = [
  { key: "overdue", label: "Überfällig", min: null, max: -1, color: "#ef4444", fixed: true, role: "overdue" },
  { key: "today",   label: "Heute",      min: 0,    max: 0,  color: "#f5560a", fixed: true, role: "warn" },
  { key: "soon",    label: "Bald",       min: 1,    max: 3,  color: "#facc15", fixed: false, role: "warn" },
  { key: "week",    label: "Woche",      min: 4,    max: 7,  color: "#0ea5e9", fixed: false, role: "ok" },
  { key: "future",  label: "Zukunft",    min: 8,    max: null, color: "#94a3b8", fixed: false, role: "ok" },
];

/**
 * Lädt Buckets von /api/settings/dueDate (oder nutzt DEFAULT_BUCKETS)
 * und injiziert CSS-Variablen + .due-<key>::before-Klassen in <head>.
 * Gibt die verwendeten Buckets zurück (nützlich für Debug/Tests).
 */
export async function injectDueStyles() {
  let buckets = DEFAULT_BUCKETS;
  try {
    const res = await fetch("/api/settings/dueDate");
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data?.buckets) ? data.buckets : [];
      if (list.length > 0) buckets = list;
    }
  } catch {
    // still use defaults
  }

  const css = buildDueCss(buckets);
  let tag = document.getElementById("due-style");
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "due-style";
    document.head.appendChild(tag);
  }
  tag.textContent = css;
  return buckets;
}

/**
 * Optionales Helper-Setup: hört auf ein Custom-Event und injiziert neu.
 * Im Settings-Tab kannst du nach erfolgreichem PUT feuern:
 *   window.dispatchEvent(new CustomEvent("due-settings-updated"))
 */
export function setupDueSettingsAutoReload() {
  const handler = () => { injectDueStyles(); };
  window.addEventListener("due-settings-updated", handler);
  return () => window.removeEventListener("due-settings-updated", handler);
}

/** Baut :root-Variablen und .due-<key>::before-Klassen */
export function buildDueCss(buckets) {
  const list = Array.isArray(buckets) ? buckets : [];
  const safeKey = (k) => String(k || "").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const lines = [];

  // :root – Farbvariablen
  lines.push(":root{");
  for (const b of list) {
    const key = safeKey(b.key);
    const color = b.color || "#94a3b8";
    lines.push(`  --due-${key}: ${color};`);
  }
  lines.push("}");

  // Klassen für linken Farbbalken
  for (const b of list) {
    const key = safeKey(b.key);
    lines.push(
      `.due-${key}::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--due-${key});border-top-left-radius:inherit;border-bottom-left-radius:inherit;}`
    );
  }

  return lines.join("\n");
}
