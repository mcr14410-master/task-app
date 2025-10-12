import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { fsSubfolders, fsExists, fsMkdir } from "@/api/fsApi";
import useToast from "@/components/ui/useToast";

const styles = {
  overlay:{
    position:'fixed', inset:0, background:'rgba(0,0,0,.45)',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000
  },
  modal:{
    width:'min(780px, 96vw)', maxHeight:'88vh', overflow:'auto',
    background:'#0f172a', color:'#e5e7eb', border:'1px solid #1f2937',
    borderRadius:12, boxShadow:'0 24px 64px rgba(0,0,0,.5)', boxSizing:'border-box'
  },
  header:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid #1f2937'},
  title:{margin:0,fontWeight:700,color:'#60a5fa'},
  body:{padding:16, overflowX:'hidden'},
  footer:{display:'flex',justifyContent:'space-between',gap:8,padding:'12px 16px',borderTop:'1px solid #1f2937'},
  btn:{padding:'8px 12px',borderRadius:8,border:'1px solid #334155',background:'transparent',color:'#e5e7eb',cursor:'pointer'},
  btnPrimary:{padding:'8px 12px',borderRadius:8,border:'1px solid #3b82f6',background:'#3b82f6',color:'#fff',cursor:'pointer'},
  btnGhost:{padding:'6px 10px',borderRadius:6,border:'1px solid transparent',background:'transparent',color:'#93c5fd',cursor:'pointer'},
  crumb:{display:'inline-flex',alignItems:'center',gap:6,cursor:'pointer',padding:'2px 6px',borderRadius:6},
  crumbSep:{opacity:.5,margin:'0 6px'},
  listItem:{padding:'10px 12px',borderBottom:'1px solid #1f2937',cursor:'pointer',display:'flex',alignItems:'center',gap:8}
};

const codeEllipsis = {
  display: 'inline-block',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  verticalAlign: 'bottom'
};

function normArray(x){ if(Array.isArray(x)) return x; if(x && Array.isArray(x.folders)) return x.folders; return []; }
function lastSegment(relPath){ if(!relPath) return ""; return relPath.replaceAll("\\","/").split("/").filter(Boolean).pop() ?? relPath; }
function joinParts(parts){ return parts.filter(Boolean).join("/"); }

const TECH_NAMES = new Set(["node_modules",".git",".svn",".hg","__MACOSX",".DS_Store","Thumbs.db"]);

export default function FolderPickerModal({
  initialSub = "",
  onSelect,
  onClose,
  title = "Ordner auswählen",
  baseLabel="\\\\server\\share\\"
}) {
  const toast = useToast();
  const [stack, setStack] = useState(initialSub ? initialSub.split("/").filter(Boolean) : []);
  const [entries, setEntries] = useState([]);        // relative Pfade (Strings)
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(true);

  // Suche / Filter
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  // Filter-Toggles
  const [hideDot, setHideDot] = useState(true);
  const [hideTech, setHideTech] = useState(true);

  // NEU: Ordner anlegen
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const subPath = useMemo(() => joinParts(stack), [stack]);

  const load = useCallback(async (sub) => {
    setLoading(true);
    try {
      const [list, ex] = await Promise.all([
        fsSubfolders(sub || ""),
        fsExists(sub || "")
      ]);
      setEntries(normArray(list).map(String));
      setExists(!!ex);
    } catch (e) {
      console.error(e);
      setEntries([]);
      setExists(false);
      toast.error("Ordner kann nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { let active = true; (async () => { await load(subPath); if(!active) return; })(); return () => { active = false; }; }, [subPath, load]);

  const goInto = (name) => name && setStack(prev => [...prev, name]);
  const goUp = () => setStack(prev => prev.slice(0,-1));
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
      .sort((a,b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return list;
  }, [entries, query, hideDot, hideTech]);

  const onSearchKeyDown = (e) => {
    if (e.key === "Escape") { setQuery(""); e.stopPropagation(); }
    if (e.key === "Enter") {
      const first = filtered[0];
      if (first) goInto(first.name);
    }
  };

  // === Ordner anlegen ===
  const canCreate = useMemo(() => {
    const n = newName.trim();
    if (!n) return false;
    if (n === "." || n === "..") return false;
    if (n.includes("/") || n.includes("\\")) return false;
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
      // in den neuen Ordner springen und neu laden
      goInto(next);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Ordner konnte nicht angelegt werden");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => { searchRef.current?.focus(); }, []);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e)=>e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button style={styles.btn} onClick={onClose} title="Schließen">✕</button>
        </div>

        <div style={styles.body}>
          {/* Breadcrumb */}
          <div style={{marginBottom:10, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', minWidth:0}}>
            <span style={{opacity:.8}}>Pfad:</span>
            <nav aria-label="Breadcrumb" style={{display:'inline', minWidth:0}}>
              {crumbs.map((c, i) => (
                <React.Fragment key={`${c.label}-${i}`}>
                  {i>0 && <span style={styles.crumbSep}>/</span>}
                  <span
                    role="link"
                    tabIndex={0}
                    onClick={c.onClick}
                    onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') c.onClick(); }}
                    style={{...styles.crumb, background: i===crumbs.length-1 ? 'rgba(59,130,246,.12)' : 'transparent'}}
                    title={i===0 ? baseLabel : joinParts(stack.slice(0, i))}
                  >
                    {c.label}
                  </span>
                </React.Fragment>
              ))}
            </nav>
            <span style={{flex:1}} />
            <button style={styles.btnGhost} onClick={goBase} disabled={stack.length===0} title="Zur Basis wechseln">
              Zur Basis
            </button>
          </div>

          {/* Info + Suche + Filter */}
          <div style={{display:'grid', gridTemplateColumns:'minmax(0,1fr) 360px', gap:12, alignItems:'end', marginBottom:10}}>
            <div style={{opacity:.8, minWidth:0}}>
              <div>Basis: <code style={codeEllipsis}>{baseLabel}</code></div>
              <div>Unterordner: <code style={codeEllipsis}>{subPath || "(Basis)"}</code> {exists ? null : <span style={{color:'#fca5a5'}}> (nicht vorhanden)</span>}</div>
              <div style={{marginTop:10, display:'flex', gap:18, alignItems:'center', flexWrap:'wrap'}}>
                <label style={{display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                  <input type="checkbox" checked={hideDot} onChange={(e)=>setHideDot(e.target.checked)} />
                  <span>.-Ordner ausblenden</span>
                </label>
                <label style={{display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                  <input type="checkbox" checked={hideTech} onChange={(e)=>setHideTech(e.target.checked)} />
                  <span>Technische Ordner ausblenden</span>
                </label>
              </div>
            </div>
            <div>
              <label style={{display:'block', fontSize:12, opacity:.8, marginBottom:6}}>Suchen/Filtern</label>
              <input
                ref={searchRef}
                value={query}
                onChange={(e)=>setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="z.B. Kunde, Projekt, Teil…"
                style={{
                  width:'100%', maxWidth:'100%', padding:'8px 10px', borderRadius:8,
                  border:'1px solid #334155', background:'#0b1220', color:'#e5e7eb'
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{display:'flex',gap:8,marginBottom:10, flexWrap:'wrap'}}>
            <button style={styles.btn} onClick={goUp} disabled={stack.length===0}>⬆️ Ebene hoch</button>
            <button style={styles.btnPrimary} onClick={chooseHere}>Diesen Ordner übernehmen</button>
            {/* Neuer Ordner */}
            <div style={{display:'flex', gap:8, alignItems:'center', marginLeft:'auto', flexWrap:'wrap'}}>
              <input
                value={newName}
                onChange={(e)=>setNewName(e.target.value)}
                onKeyDown={(e)=>{ if(e.key==='Enter' && canCreate) createFolder(); }}
                placeholder="Neuen Ordner anlegen…"
                style={{padding:'8px 10px', borderRadius:8, border:'1px solid #334155', background:'#0b1220', color:'#e5e7eb', minWidth:200}}
              />
              <button
                style={{...styles.btnPrimary, opacity: canCreate ? 1 : .5, cursor: canCreate ? 'pointer' : 'not-allowed'}}
                onClick={createFolder}
                disabled={!canCreate || creating}
                title="Ordner unterhalb des aktuellen Pfads erstellen"
              >
                {creating ? "Erstelle…" : "Ordner anlegen"}
              </button>
            </div>
          </div>

          {/* Liste */}
          <div style={{border:'1px solid #1f2937',borderRadius:8, overflowX:'hidden'}}>
            {loading ? (
              <div style={{padding:12}}>Lade…</div>
            ) : filtered.length === 0 ? (
              <div style={{padding:12,opacity:.8}}>
                {query ? <>Keine Treffer für „<b>{query}</b>“</> : "Keine Unterordner"}
              </div>
            ) : (
              <ul style={{listStyle:'none',margin:0,padding:0}}>
                {filtered.map(({rel, name}) => (
                  <li
                    key={rel}
                    onDoubleClick={()=>goInto(name)}
                    onClick={()=>goInto(name)}
                    title={rel}
                    style={styles.listItem}
                  >
                    <span aria-hidden>📁</span>
                    <span style={{flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <div style={{display:'flex',alignItems:'center',gap:8,opacity:.7}}>
            <span style={{fontSize:12}}>
              Tipp: Enter im Suchfeld öffnet den ersten Treffer. Esc löscht die Suche.
            </span>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={styles.btn} onClick={onClose}>Abbrechen</button>
            <button style={styles.btnPrimary} onClick={chooseHere}>Übernehmen</button>
          </div>
        </div>
      </div>
    </div>
  );
}
