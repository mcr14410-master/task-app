import React, { useEffect, useMemo, useState } from 'react';
import { fetchStatuses } from '@/api/statuses';

export default function StatusManagementContent() {
  const [items, setItems] = useState([]);
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchStatuses(activeOnly)
      .then(list => { if (alive) { setItems(list); setErr(''); } })
      .catch(e => { if (alive) setErr(String(e?.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [activeOnly]);

  const sorted = useMemo(() => {
    const copy = Array.isArray(items) ? [...items] : [];
    return copy.sort((a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.label).localeCompare(String(b.label))
    );
  }, [items]);

  return (
    <div className="status-mgmt" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Status</h3>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Nur aktive anzeigen
        </label>
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
                <th style={thStyle}>Final</th>
                <th style={thStyle}>Aktiv</th>
                <th style={thStyle}>Vorschau</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => (
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
                  <td style={tdStyle}>{s.isFinal ? 'Ja' : 'Nein'}</td>
                  <td style={tdStyle}>{s.active ? 'Ja' : 'Nein'}</td>
                  <td style={tdStyle}>
                    <Preview label={s.label} bg={s.colorBg} fg={s.colorFg} />
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={7}>
                    <em>Keine Einträge.</em>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

function Preview({ label, bg, fg }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '2px 8px', borderRadius: 999, background: bg, color: fg,
        border: '1px solid #ffffff22'
      }}
      role="status"
      aria-label={`Status: ${label}`}
      title={label}
    >
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor', opacity: .9 }} />
      <span>{label}</span>
    </span>
  );
}

const thStyle = { padding: '8px 8px', fontWeight: 600, fontSize: 12, color: 'var(--muted, #9ca3af)' };
const tdStyle = { padding: '10px 8px', fontSize: 14, verticalAlign: 'middle' };
const tdStyleMonospace = { ...tdStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' };
