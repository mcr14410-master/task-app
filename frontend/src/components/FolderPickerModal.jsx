// components/FolderPickerModal.jsx
// Anpassung: variable Dialogbreite (clamp), horizontales Overflow versteckt,
// Pfad-/Breadcrumb-Texte umbrechbar via overflowWrap:anywhere.
// NEU: Bei Bedarf vertikaler Scrollbalken für das Modal (overflowY:'auto').
// (Funktionalität unverändert)

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { fsSubfolders, fsExists, fsMkdir, fsIsEmpty, fsRmdir } from "@/api/fsApi";
import useToast from "@/components/ui/useToast";
import { fsHealth } from "@/api/fsApi";

/* Inline-Heroicons (Outline) */
const IconHome = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
       width="1em" height="1em" aria-hidden="true" {...props}>
    <path d="M2.25 12l9-8.25 9 8.25" />
    <path d="M4.5 10.5V21h15V10.5" />
    <path d="M9.75 21v-6h4.5v6" />
  </svg>
);
const IconArrowUp = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
       width="1em" height="1em" aria-hidden="true" {...props}>
    <path d="M12 19V5" />
    <path d="M6.75 10.25L12 5l5.25 5.25" />
  </svg>
);

// Layout & Styles – klar und responsiv
const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modal: {
    // vorher: width: 'min(820px, 96vw)'
    // neu: flexibel per clamp – ohne horizontalen Scroll
    width: 'clamp(640px, 82vw, 800px)',
    maxWidth: '95vw',
    maxHeight: '88vh',
    // Wichtig: nur horizontal verstecken, vertikal bei Bedarf scrollen
    overflowX: 'hidden',
    overflowY: 'auto',
    background: '#0f172a', color: '#e5e7eb', border: '1px solid #1f2937',
    borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,.5)'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: '1px solid #1f2937'
  },
  title: { margin: 0, fontWeight: 700, color: '#60a5fa' },

  // Breadcrumb-Bar (sticky)
  crumbBar: {
    position: 'sticky', top: 0, zIndex: 1,
    background: '#0f172a', borderBottom: '1px solid #1f2937',
    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
  },
  crumbLink: {
    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
    padding: '2px 8px', borderRadius: 999,
    minWidth: 0, // wichtig für flex-wrap
  },
  crumbSep: { opacity: .5, margin: '0 6px' },

  // Hauptbereich: 2 Spalten
  content: {
    display: 'grid',
    gridTemplateColumns: 'minmax(300px, 1fr) 340px',
    gap: 12,
    padding: 16
  },

  // Linke Spalte (Liste)
  leftCol: { display: 'grid', gridTemplateRows: 'auto 1fr', gap: 10, minHeight: 0 },
  listWrap: { border: '1px solid #1f2937', borderRadius: 8, overflow: 'hidden', minHeight: 220 },
  listHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', borderBottom: '1px solid #1f2937', background: '#0b1220'
  },
  list: { listStyle: 'none', margin: 0, padding: 0, maxHeight: '46vh', overflowY: 'auto', overflowX: 'hidden' },
  listItem: {
    padding: '10px 12px', borderBottom: '1px solid #0f172a',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10
  },
  listItemDisabled: {
    padding: '10px 12px', borderBottom: '1px solid #0f172a',
    display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280'
  },

  // Kompakte Zeilen-Aktionen (nur Icons)
  actionsRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderBottom: '1px solid #0f172a', background: '#0b1220'
  },
  iconBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
    border: '1px solid #334155', background: 'transparent', color: '#e5e7eb'
  },
  iconBtnDisabled: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6, border: '1px solid #2a3443',
    background: 'transparent', color: '#6b7280', cursor: 'not-allowed'
  },
  actionSep: { opacity: .5 },

  // Rechte Spalte (Karten)
  rightCol: {
    display: 'grid',
    gridTemplateRows: 'auto auto auto 1fr',
    gap: 12, minHeight: 0
  },
  card: { border: '1px solid #1f2937', borderRadius: 8, padding: 12, background: '#0b1220' },
  cardTitle: { margin: '0 0 8px 0', fontSize: 12, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '.06em' },

  // Footer
  footer: {
    display: 'flex', justifyContent: 'space-between', gap: 8,
    padding: '12px 16px', borderTop: '1px solid #1f2937', background: '#0f172a'
  },

  // Controls
  btn: { padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#e5e7eb', cursor: 'pointer' },
  btnPrimary: { padding: '8px 12px', borderRadius: 8, border: '1px solid #3b82f6', background: '#3b82f6', color: '#fff', cursor: 'pointer' },
  btnDanger: { padding: '5px 8px', fontSize: 12, borderRadius: 8, border: '1px solid #ef4444', background: '#ef4444', color: '#fff', cursor: 'pointer' },
  input: { width: '94%', padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e5e7eb' },
  checkboxRow: { display: 'flex', fontSize: 12, gap: 14, flexWrap: 'wrap', alignItems: 'center' },
  hint: { color: '#9ca3af', fontSize: 12 }
};

// Responsiv: bei schmalen Viewports 1 Spalte
const responsiveWrap = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0,1fr)',
  gap: 12
};

// vorher: Ellipsis/nowrap
// neu: bricht lange Pfade (C:\\Users\\… oder \\\\Server\\Share\\…)
const codeEllipsis = {
  display: 'block',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  whiteSpace: 'normal'
};

function normArray(x) { if (Array.isArray(x)) return x; if (x && Array.isArray(x.folders)) return x.folders; return []; }
function lastSegment(relPath) { if (!relPath) return ""; return relPath.replaceAll("\\\\", "/").split("/").filter(Boolean).pop() ?? relPath; }
function joinParts(parts) { return parts.filter(Boolean).join("/"); }

const TECH_NAMES = new Set(["node_modules", ".git", ".svn", ".hg", "__MACOSX", ".DS_Store", "Thumbs.db"]);

export default function FolderPickerModal({
  initialSub = "",
  onSelect,
  onClose,
  title = "Ordner auswählen",
  baseLabel = "\\\\server\\share\\"
}) {
  const toast = useToast();
  const [fsOk, setFsOk] = useState(true);
  const [fsHealthInfo, setFsHealthInfo] = useState(null);
  
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const h = await fsHealth();      // { ok, base, exists, directory, readable, writable, ts }
        if (!mounted) return;
        setFsOk(!!h?.ok);
        setFsHealthInfo(h || null);
        if (!h?.ok) {
          toast.error("Datei-Basis nicht erreichbar oder keine Rechte.");
        }
      } catch (e) {
        if (!mounted) return;
        setFsOk(false);
        setFsHealthInfo(null);
        toast.error("Health-Check fehlgeschlagen.");
      }
    })();
    return () => { mounted = false; };
  }, []);
  
  
  // Navigationszustand
  const [stack, setStack] = useState(initialSub ? initialSub.split("/").filter(Boolean) : []);
  const subPath = useMemo(() => joinParts(stack), [stack]);
  const parentSub = useMemo(() => joinParts(stack.slice(0, -1)), [stack]);
  const currentName = useMemo(() => (stack.length ? stack[stack.length - 1] : ""), [stack]);

  // Daten
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(true);
  const [isEmpty, setIsEmpty] = useState(true);

  // Suche / Filter
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const [hideDot, setHideDot] = useState(true);
  const [hideTech, setHideTech] = useState(true);

  // Neuer Ordner
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // Löschen
  const [deleting, setDeleting] = useState(false);

  // Laden der Ordnerdaten
  const load = useCallback(async (sub) => {
    setLoading(true);
    try {
      const [list, ex, emp] = await Promise.all([
        fsSubfolders(sub || ""),
        fsExists(sub || ""),
        (stack.length ? fsIsEmpty(parentSub || "", currentName) : Promise.resolve({ empty: true }))
      ]);
      setEntries(normArray(list).map(String));
      setExists(!!ex);
      setIsEmpty(!!emp?.empty);
    } catch (e) {
      console.error(e);
      setEntries([]);
      setExists(false);
      setIsEmpty(true);
      toast.error("Ordner kann nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [toast, stack.length, parentSub, currentName]);

  useEffect(() => {
    let active = true;
    (async () => { await load(subPath); if (!active) return; })();
    return () => { active = false; };
  }, [subPath, load]);

  // Navigation
  const goInto = (name) => name && setStack(prev => [...prev, name]);
  const goUp = () => setStack(prev => prev.slice(0, -1));
  const goBase = () => setStack([]);
  const chooseHere = () => onSelect?.(subPath);

  // Breadcrumbs
  const crumbs = useMemo(() => {
    const segments = ["(Basis)", ...stack];
    return segments.map((seg, idx) => ({
      label: seg,
      onClick: () => { if (idx === 0) return goBase(); setStack(stack.slice(0, idx)); }
    }));
  }, [stack]);

  // Suche & Filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = entries
      .map((rel) => {
        const name = lastSegment(rel);
        return { rel, name };
      })
      .filter(({ name }) => {
        if (hideDot && name.startsWith(".")) return false;
        if (hideTech && TECH_NAMES.has(name)) return false;
        return !q || name.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return list;
  }, [entries, query, hideDot, hideTech]);

  const onSearchKeyDown = (e) => {
    if (e.key === "Escape") { setQuery(""); e.stopPropagation(); }
    if (e.key === "Enter") {
      const first = filtered[0];
      if (first) goInto(first.name);
    }
  };

  // Ordner anlegen
  const canCreate = useMemo(() => {
    const n = newName.trim();
    if (!n) return false;
    if (n === "." || n === "..") return false;
    if (n.includes("/") || n.includes("\\\\")) return false;
    return true;
  }, [newName]);

  const createFolder = async () => {
    if (!canCreate) return;
    try {
      setCreating(true);
      await fsMkdir(subPath, newName.trim());
      toast.success(`Ordner „${newName.trim()}“ angelegt`);
      const next = newName.trim();
      setNewName("");
      goInto(next);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Ordner konnte nicht angelegt werden");
    } finally {
      setCreating(false);
    }
  };

  // Ordner löschen (nur wenn leer)
  const canDelete = useMemo(() =>
    stack.length > 0 && exists && isEmpty && !loading && !creating && !deleting
  , [stack.length, exists, isEmpty, loading, creating, deleting]);

  const deleteDisabledReason = useMemo(() => {
    if (stack.length === 0) return "Basis kann nicht gelöscht werden";
    if (!exists) return "Ordner existiert nicht";
    if (!isEmpty) return "Nur leere Ordner können gelöscht werden";
    if (loading) return "Bitte warten…";
    if (creating || deleting) return "Vorgang läuft…";
    return "Diesen Ordner löschen";
  }, [stack.length, exists, isEmpty, loading, creating, deleting]);

  const deleteFolder = async () => {
    if (!canDelete) return;
    const label = subPath || "(Basis)";
    if (!confirm(`Ordner „${label}“ wirklich löschen?\n(Hinweis: Löschen ist nur für leere Ordner erlaubt.)`)) return;
    try {
      setDeleting(true);
      await fsRmdir(parentSub || "", currentName);
      toast.success(`„${label}“ gelöscht`);
      goUp();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Ordner konnte nicht gelöscht werden");
      await load(subPath);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => { searchRef.current?.focus(); }, []);

  // Responsive Umschalten (eine Spalte unter ~900px)
  const isNarrow = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 900px)").matches;

  // Tooltip für den *unteren* Übernehmen-Button mit vollem Pfad
  const acceptTooltip = useMemo(() => {
    const baseClean = (baseLabel || "").replace(/[/\\]+$/, "");
    const sep = (baseClean.includes("\\\\") && !baseClean.includes("/")) ? "\\\\" : "/";
    const full = subPath ? `${baseClean}${sep}${subPath}` : baseClean || "(Basis)";
    return `Aktuellen Ordner übernehmen: ${full}`;
  }, [baseLabel, subPath]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Kopf */}
        {!fsOk && (
          <div style={{ padding: 10, background: '#3f1d1d', color: '#fecaca', borderBottom: '1px solid #7f1d1d' }}>
            🚧 Basis nicht verfügbar.
            {fsHealthInfo?.base && <> Basis: <code>{fsHealthInfo.base}</code></>}
          </div>
        )}
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button style={styles.btn} onClick={onClose} title="Schließen">✕</button>
        </div>

        {/* Breadcrumb-Bar */}
        <div style={styles.crumbBar}>
          <span style={{ opacity: .8 }}>Pfad:</span>
          <nav aria-label="Breadcrumb" style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
            {crumbs.map((c, i) => (
              <React.Fragment key={`${c.label}-${i}`}>
                {i > 0 && <span style={styles.crumbSep}>/</span>}
                <span
                  role="link"
                  tabIndex={0}
                  onClick={c.onClick}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') c.onClick(); }}
                  style={{ ...styles.crumbLink, background: i === crumbs.length - 1 ? 'rgba(59,130,246,.12)' : 'transparent' }}
                  title={i === 0 ? baseLabel : joinParts(stack.slice(0, i))}
                >
                  {c.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Hauptbereich */}
        <div style={isNarrow ? { ...responsiveWrap, padding: 16 } : styles.content}>
          {/* Linke Spalte: Ordnerliste */}
          <div style={styles.leftCol}>
            <div style={styles.listWrap}>
              <div style={styles.listHeader}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                  <span style={{ opacity: .8 }}>Unterordner:</span>
                  <code style={{ display: 'inline-block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {subPath || "(Basis)"}
                  </code>
                  {!exists && <span style={{ color: '#fca5a5', marginLeft: 6 }}>(nicht vorhanden)</span>}
                </div>
                {/* Hinweis entfernt */}
              </div>

              {loading ? (
                <div style={{ padding: 12 }}>Lade…</div>
              ) : (
                <ul style={styles.list}>
                  {/* Einzeilige Navigations-Aktionen: Home | Up (nur Icons) */}
                  <li style={styles.actionsRow}>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={goBase}
                      onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' '){ goBase(); } }}
                      style={styles.iconBtn}
                      title="Zur Basis wechseln"
                      aria-label="Zur Basis wechseln"
                    >
                      <IconHome style={{ fontSize: 18 }} />
                    </span>
                    <span style={styles.actionSep}>|</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={stack.length===0 ? undefined : goUp}
                      onKeyDown={(e)=>{ if(stack.length>0 && (e.key==='Enter' || e.key===' ')){ goUp(); } }}
                      style={stack.length===0 ? styles.iconBtnDisabled : styles.iconBtn}
                      title={stack.length===0 ? "Bereits auf Basis" : "Eine Ebene hoch"}
                      aria-disabled={stack.length===0}
                      aria-label="Eine Ebene hoch"
                    >
                      <IconArrowUp style={{ fontSize: 18 }} />
                    </span>
                  </li>

                  {/* Eigentliche Einträge */}
                  {filtered.length === 0 ? (
                    <li style={styles.listItemDisabled}>
                      {query ? <>Keine Treffer für „<b>{query}</b>“</> : "Keine Unterordner"}
                    </li>
                  ) : (
                    filtered.map(({ rel, name }) => (
                      <li
                        key={rel}
                        onDoubleClick={() => goInto(name)}
                        onClick={() => goInto(name)}
                        title={rel}
                        style={styles.listItem}
                      >
                        <span aria-hidden>📁</span>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </span>
                        <span style={{ opacity: .5, fontSize: 12 }}>{rel}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Rechte Spalte: Info / Suche / Filter / Neuer Ordner / Löschen */}
          <div style={styles.rightCol}>
            {/* Basis & Info */}
            <section style={styles.card} aria-label="Basis und Pfadinfo">
              <h4 style={styles.cardTitle}>Basis</h4>
              <div>Basis-Pfad: <code style={codeEllipsis}>{baseLabel}</code></div>
              <div style={{ marginTop: 6, ...styles.hint }}>Der ausgewählte Unterordner wird relativ zu dieser Basis übernommen.</div>
            </section>

            {/* Suche & Filter */}
            <section style={styles.card} aria-label="Suchen und Filtern">
              <h4 style={styles.cardTitle}>Suchen & Filtern</h4>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="z. B. Kunde, Projekt, Teil…"
                style={styles.input}
                aria-label="Suche"
              />
              <div style={{ height: 10 }} />
              <div style={styles.checkboxRow}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={hideDot} onChange={(e) => setHideDot(e.target.checked)} />
                  <span>.-Ordner ausblenden</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={hideTech} onChange={(e) => setHideTech(e.target.checked)} />
                  <span>Technische Ordner ausblenden</span>
                </label>
                {query && (
                  <button
                    type="button"
                    style={{ ...styles.btn, marginLeft: 'auto' }}
                    onClick={() => setQuery("")}
                    title="Suche zurücksetzen"
                  >
                    Reset
                  </button>
                )}
              </div>
            </section>

            {/* Neuer Ordner */}
            <section style={styles.card} aria-label="Neuen Ordner anlegen">
              <h4 style={styles.cardTitle}>Neuer Ordner</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) createFolder(); }}
                  placeholder="Neuen Ordner anlegen…"
                  style={styles.input}
                  aria-label="Neuer Ordner Name"
                />
                <button
                  style={{ ...styles.btnPrimary, whiteSpace: 'nowrap', opacity: canCreate ? 1 : .5, cursor: canCreate ? 'pointer' : 'not-allowed' }}
                  onClick={createFolder}
                  disabled={!canCreate || creating}
                  title="Ordner unterhalb des aktuellen Pfads erstellen"
                >
                  {creating ? "Erstelle…" : "Anlegen"}
                </button>
              </div>
              <div style={{ marginTop: 6, ...styles.hint }}>
                Wird unter <code>{baseLabel}{subPath ? "/" + subPath : ""}</code> erstellt.
              </div>
            </section>

            {/* Ordner löschen (nur leer) */}
            <section style={styles.card} aria-label="Ordner löschen">
              <h4 style={styles.cardTitle}>Ordner löschen</h4>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  style={{
                    ...styles.btnDanger,
                    opacity: canDelete ? 1 : .5,
                    cursor: canDelete ? 'pointer' : 'not-allowed'
                  }}
                  onClick={deleteFolder}
                  disabled={!canDelete}
                  title={deleteDisabledReason}
                >
                  {deleting ? "Lösche…" : "Ordner löschen"}
                </button>
                <span style={styles.hint}>
                  {deleteDisabledReason}
                </span>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: .75 }}>
            <span style={styles.hint}>Tipp: Enter im Suchfeld öffnet den ersten Treffer. Esc löscht die Suche.</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.btn} onClick={onClose}>Abbrechen</button>
            <button style={styles.btnPrimary} onClick={chooseHere} title={acceptTooltip}>
              Diesen Ordner übernehmen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
