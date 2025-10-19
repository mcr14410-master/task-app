import React, { useEffect, useMemo, useState } from 'react';
import { fetchStatuses, createStatus, updateStatus, deleteStatus } from '@/api/statuses';

const EMPTY = { code:'', label:'', colorBg:'#374151', colorFg:'#e5e7eb', sortOrder:0, isFinal:false, active:true };
// WCAG-Default für normalen Text
const TARGET_RATIO = 4.5;

/** --- Farb-Utils: WCAG-Kontrast --- **/
function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#','');
  const v = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  const n = parseInt(v, 16);
  if (Number.isNaN(n) || v.length !== 6) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function srgbToLin(c) {
  const cs = c / 255;
  return (cs <= 0.03928) ? (cs / 12.92) : Math.pow((cs + 0.055)/1.055, 2.4);
}
function relativeLuminance({r,g,b}) {
  const R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
  return 0.2126*R + 0.7152*G + 0.0722*B;
}
/** Kontrast-Ratio nach WCAG 2.1 */
function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  if (!a || !b) return 0;
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const lighter = Math.max(L1, L2);
  const darker  = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}
/** Wähle Weiß/Schwarz, was den höheren Kontrast zu bg ergibt */
function bestTextOn(bgHex) {
  const cWhite = contrastRatio(bgHex, '#ffffff');
  const cBlack = contrastRatio(bgHex, '#000000');
  return cWhite >= cBlack ? '#ffffff' : '#000000';
}

export default function StatusManagementContent() {
  const [items, setItems] = useState([]);
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(null);
  const [editOriginalCode, setEditOriginalCode] = useState(null);
  const [busy, setBusy] = useState(false);

  // Laden
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchStatuses(activeOnly)
      .then(list => { if (alive) { setItems(list); setErr(''); } })
      .catch(e => { if (alive) setErr(String(e?.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [activeOnly]);

  // Sortierung stabilisieren
  const sorted = useMemo(() => {
    const copy = Array.isArray(items) ? [...items] : [];
    return copy.sort((a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.label).localeCompare(String(b.label))
    );
  }, [items]);

  // Aktionen
  const startCreate = () => { setEdit({ ...EMPTY }); setEditOriginalCode(null); };
  const startEdit = (it) => { setEdit({ ...it }); setEditOriginalCode(it.code); };

  const onSave = async () => {
    if (!edit) return;
    const payload = {
      code: (edit.code || '').toUpperCase().replace(/\s+/g, '_'),
      label: (edit.label || '').trim(),
      colorBg: edit.colorBg, colorFg: edit.colorFg,
      sortOrder: Number(edit.sortOrder || 0),
      isFinal: !!edit.isFinal,
      active: !!edit.active
    };
    if (!payload.code || !payload.label) {
      setErr('Code und Bezeichnung sind Pflichtfelder.');
      return;
    }
    try {
      setBusy(true);
      setErr('');
      if (editOriginalCode && items.some(i => i.code === editOriginalCode)) {
        const updated = await updateStatus(editOriginalCode, payload);
        setItems(prev => prev.map(i => i.code === editOriginalCode ? updated : i));
      } else {
        const created = await createStatus(payload);
        setItems(prev => [...prev, created]);
      }
      setEdit(null);
      setEditOriginalCode(null);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (code) => {
    if (!confirm(`Status "${code}" deaktivieren? (active=false)`)) return;
    try {
      setBusy(true);
      await deleteStatus(code);
      const list = await fetchStatuses(activeOnly);
      setItems(list);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  // Live-Kontrast im Editor (nur, wenn Drawer offen)
  const ratio = edit ? contrastRatio(edit.colorBg, edit.colorFg) : null;
  const ratioOk = edit ? (ratio >= TARGET_RATIO) : true;
  const ratioFmt = edit ? ratio.toFixed(2) : '';

  return (
    <div className="status-mgmt" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Status</h3>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          Nur aktive anzeigen
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" onClick={startCreate} disabled={busy}>Neu</button>
        </div>
      </div>

      {err && (
        <div className="alert alert-error" role="alert" style={{
          padding: '8px 12px', borderRadius: 8, background: '#7f1d1d', color: '#fee2e2', border: '1px solid #fecaca'
        }}>
          {err}
        </div>
      )}

      {loading ? (
        <div>Lädt…</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ffffff22' }}>
                <th style={thStyle}>Sort</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Bezeichnung</th>
                <th style={thStyle}>Farben</th>
                <th style={thStyle}>Kontrast</th>
                <th style={thStyle}>Final</th>
                <th style={thStyle}>Aktiv</th>
                <th style={thStyle}>Vorschau</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => {
                const r = contrastRatio(s.colorBg, s.colorFg);
                const ok = r >= TARGET_RATIO;
                return (
                  <tr key={s.code} style={{ borderBottom: '1px solid #ffffff11' }}>
                    <td style={tdStyle}>{s.sortOrder ?? 0}</td>
                    <td style={tdStyleMonospace}>{s.code}</td>
                    <td style={tdStyle}>{s.label}</td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <Swatch value={s.colorBg} />
                        <Swatch value={s.colorFg} />
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: ok ? '#86efac' : '#fecaca' }}>
                      {r.toFixed(2)}{!ok ? ' ⚠' : ''}
                    </td>
                    <td style={tdStyle}>{s.isFinal ? 'Ja' : 'Nein'}</td>
                    <td style={tdStyle}>{s.active ? 'Ja' : 'Nein'}</td>
                    <td style={tdStyle}>
                      <Preview label={s.label} bg={s.colorBg} fg={s.colorFg} warn={!ok} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button className="btn btn-small" onClick={() => startEdit(s)} disabled={busy}>Bearbeiten</button>
                      <button className="btn btn-small btn-ghost" onClick={() => onDelete(s.code)} disabled={busy}>Deaktivieren</button>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={9}><em>Keine Einträge.</em></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer / Editor */}
      {edit && (
        <div className="drawer" style={drawerBackdropStyle} onClick={(e) => {
          if (e.target === e.currentTarget && !busy) { setEdit(null); setEditOriginalCode(null); }
        }}>
          <div className="drawer-card" style={drawerCardStyle} role="dialog" aria-modal="true" aria-label="Status bearbeiten">
            <div className="drawer-header" style={drawerHeaderStyle}>
              <strong>{editOriginalCode ? 'Status bearbeiten' : 'Status anlegen'}</strong>
              <button onClick={() => { setEdit(null); setEditOriginalCode(null); }} aria-label="Schließen" disabled={busy}
                style={{ background:'transparent', border:'none', color:'inherit', fontSize:22, cursor:'pointer' }}>×</button>
            </div>

            <div className="drawer-body" style={{ display:'grid', gap:12 }}>
              <label>Code
                <input
                  value={edit.code}
                  onChange={(e)=> setEdit(s => ({ ...s, code: e.target.value.toUpperCase().replace(/\s+/g,'_') }))}
                  placeholder="Z.B. IN_REVIEW"
                />
              </label>

              <label>Bezeichnung
                <input
                  value={edit.label}
                  onChange={(e)=> setEdit(s => ({ ...s, label: e.target.value }))}
                  placeholder="Z.B. In Review"
                />
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
              <div
                role="status"
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'8px 10px', borderRadius:10,
                  border: `1px solid ${ratioOk ? '#14532d' : '#7f1d1d'}`,
                  background: ratioOk ? '#052e16' : '#3f1212',
                  color: ratioOk ? '#bbf7d0' : '#fecaca'
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  Kontrast: {ratioFmt}:1
                </span>
                <span style={{ opacity:.9 }}>
                  Ziel ≥ {TARGET_RATIO}:1 (WCAG AA, normaler Text).
                </span>
                {!ratioOk && <span style={{ fontWeight: 600 }}>Zu niedrig – schwer lesbar.</span>}
                <span style={{ marginLeft: 'auto', display:'inline-flex', gap:8 }}>
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

              <label>Sortierung
                <input
                  type="number"
                  value={edit.sortOrder ?? 0}
                  onChange={(e)=> setEdit(s => ({ ...s, sortOrder: Number(e.target.value || 0) }))}
                />
              </label>

              <label style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="checkbox" checked={!!edit.isFinal} onChange={(e)=> setEdit(s => ({ ...s, isFinal: e.target.checked }))} />
                Final (abschließender Status)
              </label>

              <label style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="checkbox" checked={!!edit.active} onChange={(e)=> setEdit(s => ({ ...s, active: e.target.checked }))} />
                Aktiv
              </label>

              <div>
                <div style={{ marginTop: 4 }}>
                  <Preview label={edit.label || 'Vorschau'} bg={edit.colorBg} fg={edit.colorFg} warn={!ratioOk} />
                </div>
              </div>

              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => { setEdit(null); setEditOriginalCode(null); }} disabled={busy}>Abbrechen</button>
                <button className="btn" onClick={onSave} disabled={busy}>Speichern</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Swatch({ value }) {
  return (
    <span title={value} aria-label={value}
      style={{
        width: 16, height: 16, borderRadius: 8, display: 'inline-block',
        background: value, border: '1px solid #00000033'
      }} />
  );
}

function Preview({ label, bg, fg, warn }) {
  return (
    <span
      style={{
        display:'inline-flex', alignItems:'center', gap:6,
        padding:'2px 8px', borderRadius:999,
        background:bg, color:fg,
        border: warn ? '2px solid #fca5a5' : '1px solid #ffffff22',
        boxShadow: warn ? '0 0 0 2px rgba(239,68,68,0.25) inset' : 'none'
      }}
      role="status"
      aria-label={`Status: ${label}`}
      title={label}
    >
      {/* optionaler Punkt später möglich */}
      <span>{label}</span>
    </span>
  );
}

const thStyle = { padding: '8px 8px', fontWeight: 600, fontSize: 12, color: 'var(--muted, #9ca3af)' };
const tdStyle = { padding: '10px 8px', fontSize: 14, verticalAlign: 'middle' };
const tdStyleMonospace = { ...tdStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' };

const drawerBackdropStyle = {
  position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'grid', placeItems:'center', zIndex:1100
};
const drawerCardStyle = {
  width:560, maxWidth:'90vw', maxHeight:'86vh', overflow:'auto',
  background:'var(--color-surface, #111827)', color:'var(--color-text, #e5e7eb)',
  borderRadius:16, padding:16, boxShadow:'0 10px 40px rgba(0,0,0,0.6)'
};
const drawerHeaderStyle = { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, borderBottom:'1px solid #ffffff22', paddingBottom:8 };
