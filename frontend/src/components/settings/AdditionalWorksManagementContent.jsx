import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAdditionalWorks,
  createAdditionalWork,
  updateAdditionalWork,
  deleteAdditionalWork,
} from '@/api/additionalWorks';

// Template für "Neu anlegen"
const EMPTY = {
  code: '',
  label: '',
  colorBg: '#374151',
  colorFg: '#e5e7eb',
  sortOrder: 0,
  active: true,
  flags: [],
  type: '',
  isFinal: false, // muss beim POST ans Backend existieren, Default false
};

// WCAG Ziel-Kontrast
const TARGET_RATIO = 4.5;

/** Farb-Utils (gleich wie bei Status) **/
function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#','');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(v, 16);
  if (Number.isNaN(n) || v.length !== 6) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function srgbToLin(c) { const cs = c / 255; return (cs <= 0.03928) ? (cs / 12.92) : Math.pow((cs + 0.055)/1.055, 2.4); }
function relativeLuminance({r,g,b}) { const R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b); return 0.2126*R + 0.7152*G + 0.0722*B; }
function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  if (!a || !b) return 0;
  const L1 = relativeLuminance(a), L2 = relativeLuminance(b);
  const lighter = Math.max(L1, L2), darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}
function bestTextOn(bgHex) {
  const cWhite = contrastRatio(bgHex, '#ffffff');
  const cBlack = contrastRatio(bgHex, '#000000');
  return cWhite >= cBlack ? '#ffffff' : '#000000';
}

export default function AdditionalWorkManagementContent() {
  const [items, setItems] = useState([]);
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(null);
  const [editId, setEditId] = useState(null); // primary key
  const [busy, setBusy] = useState(false);

  // Drag & Drop Sortierung
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const dragIndexRef = useRef(-1);

  // Laden der Zusatzarbeiten
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAdditionalWorks()
      .then(list => {
        if (!alive) return;
        // Backend liefert ALLE. Wir filtern, wenn activeOnly gesetzt ist.
        let arr = Array.isArray(list) ? list.slice() : [];
        if (activeOnly) {
          arr = arr.filter(x => x.active);
        }
        setItems(arr);
        setErr('');
      })
      .catch(e => {
        if (alive) setErr(String(e?.message || e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [activeOnly]);

  // Sortierte Ansicht (sortOrder, dann label)
  const sorted = useMemo(() => {
    const copy = Array.isArray(items) ? [...items] : [];
    return copy.sort((a,b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      String(a.label).localeCompare(String(b.label))
    );
  }, [items]);

  // Aktionen
  const startCreate = () => {
    setEdit({ ...EMPTY });
    setEditId(null);
  };

  const startEdit = (it) => {
    // flags vom Server sind schon Array<String>; falls nicht, fallback
    setEdit({
      ...it,
      flags: Array.isArray(it.flags) ? it.flags.slice() : [],
      isFinal: !!it.isFinal,
    });
    setEditId(it.id);
  };

  // Pflichtvalidierung / Code-Normalisierung
  const codeNormalized = useMemo(() => {
    if (!edit?.code) return '';
    return edit.code.toLowerCase().replace(/\s+/g, '_'); // Zusatzarbeiten: lowercase sinnvoller
  }, [edit?.code]);

  const isDuplicateCode = useMemo(() => {
    if (!edit) return false;
    const current = codeNormalized;
    if (!current) return false;
    // beim Bearbeiten darf der eigene Code bleiben
    if (editId != null) {
      const prev = items.find(x => x.id === editId);
      if (prev && prev.code && prev.code.toLowerCase() === current) return false;
    }
    return items.some(i => (i.code || '').toLowerCase() === current);
  }, [items, edit, editId, codeNormalized]);

  const missingRequired = useMemo(() => {
    if (!edit) return true;
    return !codeNormalized || !(edit.label && edit.label.trim());
  }, [edit, codeNormalized]);

  const canSave = !!edit && !busy && !missingRequired && !isDuplicateCode;

  async function onSave() {
    if (!edit) return;
    if (!canSave) {
      setErr(isDuplicateCode ? 'Code bereits vergeben.' : 'Bitte Pflichtfelder ausfüllen.');
      return;
    }

    // Flags intern speichern als Liste, Backend erwartet flags als Array (DTO),
    // mapped dann nach String. isFinal muss mit, sonst db NOT NULL.
    const payload = {
      code: codeNormalized,
      label: (edit.label || '').trim(),
      colorBg: edit.colorBg,
      colorFg: edit.colorFg,
      sortOrder: Number(edit.sortOrder || 0),
      active: !!edit.active,
      isFinal: !!edit.isFinal,
      type: edit.type || null,
      flags: Array.isArray(edit.flags)
        ? edit.flags.map(f => f.trim()).filter(Boolean)
        : [],
    };

    try {
      setBusy(true);
      setErr('');
      if (editId != null) {
        const updated = await updateAdditionalWork(editId, payload);
        setItems(prev => prev.map(i => i.id === editId ? updated : i));
      } else {
        const created = await createAdditionalWork(payload);
        setItems(prev => [...prev, created]);
      }
      setEdit(null);
      setEditId(null);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  // Aktiv/Inaktiv togglen
  async function onToggleActive(row, desiredActive) {
    try {
      setBusy(true);
      setErr('');
      // optimistic UI:
      setItems(prev => prev.map(i => i.id === row.id ? { ...i, active: desiredActive } : i));
      const updated = await updateAdditionalWork(row.id, {
        code: row.code,
        label: row.label,
        colorBg: row.colorBg,
        colorFg: row.colorFg,
        sortOrder: row.sortOrder ?? 0,
        isFinal: !!row.isFinal,
        active: !!desiredActive,
        type: row.type || null,
        flags: Array.isArray(row.flags) ? row.flags : [],
      });
      setItems(prev => prev.map(i => i.id === row.id ? updated : i));
    } catch (e) {
      // rollback
      setItems(prev => prev.map(i => i.id === row.id ? { ...i, active: row.active } : i));
      setErr(`Konnte Zusatzarbeit "${row.label}" nicht ${desiredActive ? 'aktivieren' : 'deaktivieren'}: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  // Löschen (bzw. deaktivieren per DELETE)
  async function onDelete(row) {
    if (!confirm(`Zusatzarbeit "${row.label}" wirklich löschen/deaktivieren?`)) return;
    try {
      setBusy(true);
      await deleteAdditionalWork(row.id);
      // Nach Löschen frisch ziehen
      const list = await fetchAdditionalWorks();
      let arr = Array.isArray(list) ? list.slice() : [];
      if (activeOnly) arr = arr.filter(x => x.active);
      setItems(arr);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  /** Drag & Drop Sortierung, analog Status */
  function onDragStartRow(id, idx) {
    setDragId(id);
    dragIndexRef.current = idx;
  }
  function onDragOverRow(e, overId) {
    e.preventDefault();
    if (dragOverId !== overId) setDragOverId(overId);
  }
  function onDragEndOrLeave() {
    setDragOverId(null);
  }
  async function onDropRow(e, overId) {
    e.preventDefault();
    setDragOverId(null);
    if (!dragId || dragId === overId) { setDragId(null); return; }

    const view = [...sorted];
    const from = view.findIndex(s => s.id === dragId);
    const to   = view.findIndex(s => s.id === overId);
    if (from < 0 || to < 0) { setDragId(null); return; }

    const moved = view.splice(from, 1)[0];
    view.splice(to, 0, moved);

    // sortOrder neu verteilen
    const orderMap = new Map(view.map((s, i) => [s.id, i]));
    const nextItems = items.map(s => orderMap.has(s.id) ? { ...s, sortOrder: orderMap.get(s.id) } : s);
    setItems(nextItems);
    setDragId(null);

    try {
      setBusy(true);
      // jeden Eintrag, dessen sortOrder sich geändert hat, updaten
      for (let i = 0; i < view.length; i++) {
        const aw = view[i];
        if ((aw.sortOrder ?? 0) !== i) {
          await updateAdditionalWork(aw.id, {
            code: aw.code,
            label: aw.label,
            colorBg: aw.colorBg,
            colorFg: aw.colorFg,
            sortOrder: i,
            isFinal: !!aw.isFinal,
            active: !!aw.active,
            type: aw.type || null,
            flags: Array.isArray(aw.flags) ? aw.flags : [],
          });
        }
      }
    } catch (e) {
      setErr(`Reihenfolge speichern fehlgeschlagen: ${e?.message || e}`);
      try {
        const fresh = await fetchAdditionalWorks();
        let arr = Array.isArray(fresh) ? fresh.slice() : [];
        if (activeOnly) arr = arr.filter(x => x.active);
        setItems(arr);
      } catch {}
    } finally {
      setBusy(false);
    }
  }

  // Kontrast für Drawer-Vorschau
  const ratio = edit ? contrastRatio(edit.colorBg, edit.colorFg) : null;
  const ratioOk = edit ? (ratio >= TARGET_RATIO) : true;
  const ratioFmt = edit ? ratio.toFixed(2) : '';

  return (
    <div className="aw-mgmt" style={{ display: 'grid', gap: 12 }}>
      {/* Header-Leiste */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Zusatzarbeiten</h3>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e)=>setActiveOnly(e.target.checked)}
          />
          Nur aktive anzeigen
        </label>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" onClick={startCreate} disabled={busy}>Neu</button>
        </div>
      </div>

      {err && (
        <div className="alert alert-error" role="alert" style={{
          padding: '8px 12px',
          borderRadius: 8,
          background: '#7f1d1d',
          color: '#fee2e2',
          border: '1px solid #fecaca'
        }}>
          {err}
        </div>
      )}

      {loading ? (
        <div>Lädt…</div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table className="table" style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ textAlign:'left', borderBottom:'1px solid #ffffff22' }}>
                <th style={thStyle}>⠿</th>
                <th style={thStyle}>Sort</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Bezeichnung</th>
                <th style={thStyle}>Flags</th>
                <th style={thStyle}>Farben</th>
                <th style={thStyle}>Kontrast</th>
                <th style={thStyle}>Aktiv</th>
                <th style={thStyle}>Vorschau</th>
                <th style={thStyle}></th>
              </tr>
            </thead>

            <tbody>
              {sorted.map((aw, idx) => {
                const r = contrastRatio(aw.colorBg, aw.colorFg);
                const ok = r >= TARGET_RATIO;
                const isDragging = dragId === aw.id;
                const isOver = dragOverId === aw.id && dragId && dragId !== aw.id;
                return (
                  <tr
                    key={aw.id}
                    draggable
                    onDragStart={() => onDragStartRow(aw.id, idx)}
                    onDragOver={(e)=>onDragOverRow(e, aw.id)}
                    onDrop={(e)=>onDropRow(e, aw.id)}
                    onDragEnd={onDragEndOrLeave}
                    onDragLeave={onDragEndOrLeave}
                    style={{
                      borderBottom:'1px solid #ffffff11',
                      background: isOver ? '#ffffff0f' : (isDragging ? '#ffffff08' : 'transparent'),
                      outline: isOver ? '2px dashed #ffffff44' : 'none'
                    }}
                  >
                    <td style={{ ...tdStyle, cursor:'grab', opacity:.9 }} title="Ziehen zum Sortieren">⠿</td>
                    <td style={tdStyle}>{aw.sortOrder ?? 0}</td>
                    <td style={tdStyleMonospace}>{aw.code}</td>
                    <td style={tdStyle}>{aw.label}</td>
                    <td style={tdStyle}>
                      {Array.isArray(aw.flags) && aw.flags.length
                        ? aw.flags.join(", ")
                        : <span style={{opacity:.4}}>-</span>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                        <Swatch value={aw.colorBg} />
                        <Swatch value={aw.colorFg} />
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: ok ? '#86efac' : '#fecaca' }}>
                      {r.toFixed(2)}{!ok ? ' ⚠' : ''}
                    </td>
                    <td style={tdStyle}>{aw.active ? 'Ja' : 'Nein'}</td>
                    <td style={tdStyle}>
                      <Preview label={aw.label} bg={aw.colorBg} fg={aw.colorFg} warn={!ok} />
                    </td>
                    <td style={{
                      ...tdStyle,
                      textAlign:'right',
                      whiteSpace:'nowrap',
                      display:'flex',
                      gap:6,
                      justifyContent:'flex-end'
                    }}>
                      <button className="btn btn-small" onClick={()=>startEdit(aw)} disabled={busy}>
                        Bearbeiten
                      </button>

                      {aw.active ? (
                        <button
                          className="btn btn-small btn-ghost"
                          title="Deaktivieren (wird bei Tasks nicht mehr auswählbar)"
                          onClick={()=>onToggleActive(aw,false)}
                          disabled={busy}
                        >
                          Deaktivieren
                        </button>
                      ) : (
                        <button
                          className="btn btn-small"
                          title="Reaktivieren"
                          onClick={()=>onToggleActive(aw,true)}
                          disabled={busy}
                        >
                          Aktivieren
                        </button>
                      )}

                      <button
                        aria-label="Löschen"
                        title="Löschen/Deaktivieren"
                        onClick={()=>onDelete(aw)}
                        disabled={busy}
                        style={{
                          border:'1px solid #7f1d1d',
                          background:'transparent',
                          color:'#fecaca',
                          padding:'2px 8px',
                          borderRadius:8,
                          cursor:'pointer',
                          lineHeight:1,
                        }}
                        onMouseEnter={(e)=> { e.currentTarget.style.background = '#7f1d1d33'; }}
                        onMouseLeave={(e)=> { e.currentTarget.style.background = 'transparent'; }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}

              {sorted.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={10}><em>Keine Einträge.</em></td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ fontSize:12, color:'var(--muted,#9ca3af)', marginTop:6 }}>
            Tipp: Ziehe die Zeilen mit „⠿“, um die Sortierung zu ändern. Die neue Reihenfolge wird automatisch gespeichert.
          </div>
        </div>
      )}

      {/* Drawer / Editor */}
      {edit && (
        <div
          className="drawer"
          style={drawerBackdropStyle}
          onClick={(e)=>{
            if (e.target === e.currentTarget && !busy) { setEdit(null); setEditId(null); }
          }}
        >
          <div
            className="drawer-card"
            style={drawerCardStyle}
            role="dialog"
            aria-modal="true"
            aria-label="Zusatzarbeit bearbeiten"
          >
            <div className="drawer-header" style={drawerHeaderStyle}>
              <strong>{editId != null ? 'Zusatzarbeit bearbeiten' : 'Zusatzarbeit anlegen'}</strong>
              <button
                onClick={()=>{ setEdit(null); setEditId(null); }}
                aria-label="Schließen"
                disabled={busy}
                style={{
                  background:'transparent', border:'none', color:'inherit',
                  fontSize:22, cursor:'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div className="drawer-body" style={{ display:'grid', gap:12 }}>
              <label>Code
                <input
                  value={edit.code}
                  onChange={(e)=> setEdit(s => ({ ...s, code: e.target.value.toLowerCase().replace(/\s+/g,'_') }))}
                  placeholder="z.B. fai"
                  style={{
                    border: isDuplicateCode ? '1px solid #fca5a5' : '1px solid #ffffff22',
                    outline: isDuplicateCode ? '2px solid rgba(239,68,68,0.35)' : 'none',
                    borderRadius:8, padding:'6px 8px',
                    background:'var(--color-surface,#111827)',
                    color:'var(--color-text,#e5e7eb)'
                  }}
                  aria-invalid={isDuplicateCode}
                  aria-describedby={isDuplicateCode ? 'code-error' : undefined}
                />
                {isDuplicateCode && (
                  <div id="code-error" role="alert" style={{ color:'#fecaca', fontSize:12, marginTop:4 }}>
                    Code bereits vergeben. Bitte wähle einen anderen.
                  </div>
                )}
              </label>

              <label>Bezeichnung
                <input
                  value={edit.label}
                  onChange={(e)=> setEdit(s => ({ ...s, label: e.target.value }))}
                  placeholder="z.B. Erstbemusterung"
                />
              </label>

              <label>Flags (kommagetrennt)
                <input
                  value={Array.isArray(edit.flags) ? edit.flags.join(", ") : ""}
                  onChange={(e)=> {
                    const parts = e.target.value.split(",").map(x => x.trim()).filter(Boolean);
                    setEdit(s => ({ ...s, flags: parts }));
                  }}
                  placeholder="z.B. fai, dokumentation"
                />
                <div style={{ fontSize:12, opacity:.6, marginTop:4 }}>
                  Flags können später für Auswertungen / Filter genutzt werden.
                </div>
              </label>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <label>Hintergrundfarbe
                  <input
                    type="color"
                    value={edit.colorBg}
                    onChange={(e)=> setEdit(s => ({ ...s, colorBg: e.target.value }))}
                  />
                </label>

                <label>Textfarbe
                  <input
                    type="color"
                    value={edit.colorFg}
                    onChange={(e)=> setEdit(s => ({ ...s, colorFg: e.target.value }))}
                  />
                </label>
              </div>

              {/* Kontrast-Hinweis */}
              <ContrastNotice
                ratio={ratio}
                ratioOk={ratioOk}
                ratioFmt={ratioFmt}
                edit={edit}
                setEdit={setEdit}
              />

              <label>Sortierung
                <input
                  type="number"
                  value={edit.sortOrder ?? 0}
                  onChange={(e)=> setEdit(s => ({ ...s, sortOrder: Number(e.target.value || 0) }))}
                />
              </label>

              <label style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input
                  type="checkbox"
                  checked={!!edit.active}
                  onChange={(e)=> setEdit(s => ({ ...s, active: e.target.checked }))}
                />
                Aktiv
              </label>

              {/* kleine Pill-Vorschau */}
              <div>
                <div style={{ marginTop:4 }}>
                  <Preview
                    label={edit.label || 'Vorschau'}
                    bg={edit.colorBg}
                    fg={edit.colorFg}
                    warn={!ratioOk}
                  />
                </div>
              </div>

              <div style={{
                display:'flex',
                gap:8,
                justifyContent:'flex-end',
                marginTop:8
              }}>
                <button
                  className="btn btn-ghost"
                  onClick={()=>{ setEdit(null); setEditId(null); }}
                  disabled={busy}
                >
                  Abbrechen
                </button>
                <button
                  className="btn"
                  onClick={onSave}
                  disabled={!canSave}
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContrastNotice({ ratio, ratioOk, ratioFmt, edit, setEdit }) {
  return (
    <div
      role="status"
      style={{
        display:'flex',
        alignItems:'center',
        gap:12,
        padding:'8px 10px',
        borderRadius:10,
        border: `1px solid ${ratioOk ? '#14532d' : '#7f1d1d'}`,
        background: ratioOk ? '#052e16' : '#3f1212',
        color: ratioOk ? '#bbf7d0' : '#fecaca'
      }}
    >
      <span style={{ fontWeight:700 }}>
        Kontrast: {ratioFmt}:1
      </span>
      <span style={{ opacity:.9 }}>
        Ziel ≥ {TARGET_RATIO}:1 (WCAG AA, normaler Text).
      </span>
      {!ratioOk && (
        <span style={{ fontWeight:600 }}>
          Zu niedrig – schwer lesbar.
        </span>
      )}
      <span style={{
        marginLeft:'auto',
        display:'inline-flex',
        gap:8
      }}>
        <button
          className="btn btn-small"
          type="button"
          onClick={() => setEdit(s => ({ ...s, colorFg: bestTextOn(s.colorBg) }))}
        >
          Auto-Kontrast
        </button>
        <button
          className="btn btn-small btn-ghost"
          type="button"
          onClick={() => setEdit(s => ({ ...s, colorBg: s.colorFg, colorFg: s.colorBg }))}
        >
          Farben tauschen
        </button>
      </span>
    </div>
  );
}

function Swatch({ value }) {
  return (
    <span
      title={value}
      aria-label={value}
      style={{
        width:16,
        height:16,
        borderRadius:8,
        display:'inline-block',
        background:value,
        border:'1px solid #00000033'
      }}
    />
  );
}

function Preview({ label, bg, fg, warn }) {
  return (
    <span
      style={{
        display:'inline-flex',
        alignItems:'center',
        gap:6,
        padding:'2px 8px',
        borderRadius:999,
        background:bg,
        color:fg,
        border: warn ? '2px solid #fca5a5' : '1px solid #ffffff22',
        boxShadow: warn ? '0 0 0 2px rgba(239,68,68,0.25) inset' : 'none'
      }}
      role="status"
      aria-label={`Zusatzarbeit: ${label}`}
      title={label}
    >
      <span>{label}</span>
    </span>
  );
}

const thStyle = {
  padding:'8px 8px',
  fontWeight:600,
  fontSize:12,
  color:'var(--muted, #9ca3af)'
};
const tdStyle = {
  padding:'10px 8px',
  fontSize:14,
  verticalAlign:'middle'
};
const tdStyleMonospace = {
  ...tdStyle,
  fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'
};

const drawerBackdropStyle = {
  position:'fixed',
  inset:0,
  background:'rgba(0,0,0,0.45)',
  display:'grid',
  placeItems:'center',
  zIndex:1100
};
const drawerCardStyle = {
  width:560,
  maxWidth:'90vw',
  maxHeight:'86vh',
  overflow:'auto',
  background:'var(--color-surface, #111827)',
  color:'var(--color-text, #e5e7eb)',
  borderRadius:16,
  padding:16,
  boxShadow:'0 10px 40px rgba(0,0,0,0.6)'
};
const drawerHeaderStyle = {
  display:'flex',
  alignItems:'center',
  justifyContent:'space-between',
  marginBottom:8,
  borderBottom:'1px solid #ffffff22',
  paddingBottom:8
};
