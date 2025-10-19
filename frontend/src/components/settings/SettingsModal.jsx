import React, { useState, useEffect, useCallback } from 'react';
import StatusManagementContent from '@/components/settings/StatusManagementContent'; // NEU

export default function SettingsModal({ onClose }) {
  const [tab, setTab] = useState('stations'); // 'stations' | 'statuses'

  // ESC zum Schließen
  const onKey = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKey]);

  return (
    <div
      id="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="modal-backdrop"
      style={{
        position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
        background: 'rgba(0,0,0,0.5)', zIndex: 1000
      }}
    >
      <div
        className="modal"
        style={{
          width: 720, maxWidth: '90vw', maxHeight: '85vh', overflow: 'hidden',
          background: 'var(--color-surface, #111827)', color: 'var(--color-text, #e5e7eb)',
          borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
        }}
      >
        <div
          className="modal-header"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #ffffff22' }}
        >
          <h2 id="settings-title" style={{ margin: 0, fontSize: 18 }}>Einstellungen</h2>
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: 'transparent', border: 'none', color: 'inherit',
              fontSize: 24, lineHeight: 1, cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <div className="tabs" style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid #ffffff22' }}>
          <button
            className={tab==='stations'?'tab active':'tab'}
            onClick={()=>setTab('stations')}
            style={tabButtonStyle(tab === 'stations')}
          >
            Stationen
          </button>
          <button
            className={tab==='statuses'?'tab active':'tab'}
            onClick={()=>setTab('statuses')}
            style={tabButtonStyle(tab === 'statuses')}
          >
            Status
          </button>
        </div>

        <div className="modal-content" style={{ padding: 12, overflow: 'auto', maxHeight: 'calc(85vh - 110px)' }}>
          {tab === 'stations' && (
            <div style={{ opacity: 0.8 }}>
              {/* Platzhalter – bestehendes StationManagement wird hier später eingebunden */}
              <em>Stationen-Management kommt hier rein.</em>
            </div>
          )}
          {tab === 'statuses' && (
            <StatusManagementContent />
          )}
        </div>
      </div>
    </div>
  );
}

function tabButtonStyle(active) {
  return {
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid ' + (active ? '#ffffff40' : '#ffffff22'),
    background: active ? '#ffffff14' : 'transparent',
    color: 'inherit',
    cursor: 'pointer'
  };
}
