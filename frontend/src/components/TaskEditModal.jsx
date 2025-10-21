// components/TaskEditModal.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { apiPatch, apiDelete } from "@/config/apiClient";
import "../config/TaskStatusTheme.css";
import "../config/AdditionalWorkTheme.css";
import useToast from "@/components/ui/useToast";
import FolderPickerModal from "./FolderPickerModal";
import { fsExists, fsBaseLabel } from "@/api/fsApi";
import AttachmentTab from "./AttachmentTab";
import { fetchStatuses } from "@/api/statuses";

const styles = {
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { backgroundColor: "#0f172a", color: "#e5e7eb", padding: "22px 24px", borderRadius: 12, width: 720, maxWidth: "96vw", maxHeight: "88vh", overflowY: "auto", border: "1px solid #1f2937", boxShadow: "0 24px 64px rgba(0,0,0,.5)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #1f2937" },
  title: { margin: 0, fontSize: "1.1rem", color: "#3b82f6", fontWeight: 700 },
  closeBtn: { background: "transparent", border: "1px solid #334155", color: "#cbd5e1", borderRadius: 8, padding: "6px 10px", cursor: "pointer" },
  section: { backgroundColor: "#111827", padding: 14, borderRadius: 10, marginBottom: 12, border: "1px solid #1f2937" },
  sectionTitle: { margin: "0 0 10px 0", fontSize: ".82rem", color: "#94a3b8", borderBottom: "1px solid #1f2937", paddingBottom: 6, textTransform: "uppercase", fontWeight: 600, letterSpacing: ".04em" },
  label: { display: "block", marginBottom: 6, fontWeight: 600, color: "#e5e7eb", fontSize: ".9rem" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #1f2937", borderRadius: 10, backgroundColor: "#111827", color: "#e5e7eb", fontSize: ".95rem", outline: "none", boxSizing: "border-box" },
  textarea: { minHeight: 100, resize: "vertical" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  footer: { marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, paddingTop: 12, borderTop: "1px solid #1f2937" },
  btnPrimary: { padding: "10px 16px", backgroundColor: "#3b82f6", color: "#fff", border: "1px solid #3b82f6", borderRadius: 10, cursor: "pointer", fontWeight: 700 },
  btnDanger: { padding: "10px 16px", backgroundColor: "#ef4444", color: "#fff", border: "1px solid #ef4444", borderRadius: 10, cursor: "pointer", fontWeight: 700 },
  btnSecondary: { padding: "10px 16px", backgroundColor: "transparent", color: "#cbd5e1", border: "1px solid #334155", borderRadius: 10, cursor: "pointer", fontWeight: 600 },
  tabsRow: { display: "flex", gap: 8, marginBottom: 12 },
  tabBtn: (active) => ({ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: active ? "#1f2937" : "transparent", color: "#e5e7eb", cursor: "pointer", fontWeight: 600 }),

  crumbBtn: { background: "#24282e", border: "1px solid #2a2d33", color: "#c6c9cf", padding: "4px 8px", borderRadius: 999, cursor: "pointer" },
  crumbSep: { color: "#6d7480", margin: "0 4px" },
  muted: { color: "#9ca3af", fontSize: 12 }
};

/** Farb-Utils (Hover/Active-Hintergründe) */
function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#','');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (v.length !== 6) return null;
  const n = parseInt(v, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function toRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(23,32,50,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

const statusStyles = {
  pillBase: { display:'inline-flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:999, border:'1px solid #ffffff22', cursor:'pointer', userSelect:'none' },
  menu: { position:'absolute', minWidth:220, maxHeight:260, overflowY:'auto', backgroundColor:'#0b1220', color:'#e5e7eb', border:'1px solid #1f2937', borderRadius:10, boxShadow:'0 20px 60px rgba(0,0,0,.45)', padding:6, zIndex:1200 },
  menuItem: (active, disabled, colors) => {
    const baseBg = colors?.bg ? toRgba(colors.bg, 0.14) : 'transparent';
    const activeBg = colors?.bg ? toRgba(colors.bg, 0.30) : '#172032';
    return {
      display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px', borderRadius:8, textAlign:'left',
      backgroundColor: active ? activeBg : baseBg,
      opacity: disabled ? .45 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
      border:'1px solid ' + (active ? '#ffffff22' : 'transparent'),
      color: colors?.fg || undefined
    };
  },
  dot: (color) => ({ width:8, height:8, borderRadius:999, backgroundColor:color, boxShadow:'0 0 0 2px #000 inset' })
};

const DEFAULT_BASE_LABEL = "\\\\server\\share\\";

export default function TaskEditModal({
  task,
  stations = [],
  onClose,
  onSave,
  onDeleted,
  initialTab = "details"
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(initialTab || "details");
  const [submitting, setSubmitting] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  /** Statusliste laden (aktiv) */
  const [statuses, setStatuses] = useState([]);
  const [statusErr, setStatusErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await fetchStatuses(true);
        if (!alive) return;
        const sorted = (list || []).slice().sort((a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          String(a.label).localeCompare(String(b.label))
        );
        setStatuses(sorted);
        setStatusErr('');
      } catch {
        if (alive) setStatusErr('Statusliste konnte nicht geladen werden.');
      }
    })();
    return () => { alive = false; };
  }, []);

  /** Base-Pfad für Anzeige */
  const [baseLabel, setBaseLabel] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const label = await fsBaseLabel();
        if (!cancelled) setBaseLabel(label);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  function joinBaseAndSub(base, sub) {
    if (!base) return sub || "";
    const hasBackslashBase = base.includes("\\") && !base.includes("/");
    const cleanBase = base.replace(/[/\\]+$/, "");
    if (!sub) return cleanBase;
    const sep = hasBackslashBase ? "\\" : "/";
    return `${cleanBase}${sep}${sub}`;
  }

  /** Formularzustand – Status bevorzugt aus statusCode */
  const [form, setForm] = useState(() => ({
    id: task?.id ?? null,
    bezeichnung: task?.bezeichnung ?? "",
    teilenummer: task?.teilenummer ?? "",
    kunde: task?.kunde ?? "",
    endDatum: task?.endDatum ?? "",
    aufwandStunden: Number.isFinite(Number(task?.aufwandStunden)) ? Number(task?.aufwandStunden) : 0,
    stk: Number.isFinite(Number(task?.stk)) ? Number(task?.stk) : 0,
    fa: task?.fa ?? "",
    dateipfad: task?.dateipfad ?? "",
	zustaendig: task?.zustaendig ?? task?.zuständig ?? "",
	zusaetzlicheInfos: task?.zusaetzlicheInfos ?? task?.zusätzlicheInfos ?? "",
    arbeitsstation: task?.arbeitsstation ?? (stations[0]?.name ?? ""),
    status: task?.statusCode ?? task?.status ?? "NEU",
    fai: !!task?.fai,
    qs: !!task?.qs
  }));

  const setValue = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  /** Status-Pill Dropdown (ohne Auto-Persist) */
  const statusBtnRef = useRef(null);
  const statusMenuRef = useRef(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [hi, setHi] = useState(-1);

  const currentStatus = useMemo(
    () => statuses.find(s => s.code === form.status) || null,
    [statuses, form?.status]
  );

  const visibleList = useMemo(() => (
    statuses.length ? statuses : [
      { code:'NEU', label:'Neu', colorBg:'#2e3847', colorFg:'#d7e3ff', sortOrder:0, isFinal:false, active:true },
      { code:'TO_DO', label:'To do', colorBg:'#374151', colorFg:'#e5e7eb', sortOrder:1, isFinal:false, active:true },
      { code:'IN_BEARBEITUNG', label:'In Bearbeitung', colorBg:'#1f4a3a', colorFg:'#b5f5d1', sortOrder:2, isFinal:false, active:true },
      { code:'FERTIG', label:'Fertig', colorBg:'#133b19', colorFg:'#b2fcb8', sortOrder:3, isFinal:true, active:true }
    ]
  ), [statuses]);

  const enabledIdxs = useMemo(
    () => visibleList.reduce((acc, s, idx) => (s.active ? (acc.push(idx), acc) : acc), []),
    [visibleList]
  );

  function openStatusMenu() {
    setStatusMenuOpen(true);
    const curIdx = visibleList.findIndex(s => s.code === form.status && s.active);
    const start = curIdx >= 0 ? curIdx : (enabledIdxs[0] ?? -1);
    setHi(start);
    setTimeout(() => statusMenuRef.current?.focus(), 0);
  }
  function closeStatusMenu() {
    setStatusMenuOpen(false);
    setHi(-1);
    setTimeout(() => statusBtnRef.current?.focus(), 0);
  }
  function move(delta) {
    if (!enabledIdxs.length) return;
    const pos = enabledIdxs.indexOf(hi);
    const next = pos < 0 ? enabledIdxs[0] : enabledIdxs[(pos + delta + enabledIdxs.length) % enabledIdxs.length];
    setHi(next);
  }
  function choose(idx) {
    const s = visibleList[idx];
    if (!s || !s.active) return;
    if (s.isFinal && s.code !== form.status) {
      const ok = confirm(`Status „${s.label}“ ist final. Trotzdem setzen?`);
      if (!ok) return;
    }
    // Nur lokal setzen – Persistenz erst bei "Speichern"
    setForm(prev => ({ ...prev, status: s.code }));
    closeStatusMenu();
  }

  // Klick außerhalb schließt
  useEffect(() => {
    if (!statusMenuOpen) return;
    const onDown = (e) => {
      if (!statusMenuRef.current || !statusBtnRef.current) return;
      if (!statusMenuRef.current.contains(e.target) && !statusBtnRef.current.contains(e.target)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [statusMenuOpen]);

  /** Sanitizer */
  const sanitize = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") {
      const t = value.trim();
      return t === "" ? null : t;
    }
    return value;
  };

  /** Build Payload – statusCode mitgeben (wichtig fürs Backend) */
  const buildPayload = () => {
    const payload = {
      bezeichnung: sanitize(form.bezeichnung),
      teilenummer: sanitize(form.teilenummer),
      kunde: sanitize(form.kunde),
      endDatum: sanitize(form.endDatum),
      aufwandStunden: Number.isFinite(Number(form.aufwandStunden)) ? Number(form.aufwandStunden) : 0,
      zuständig: sanitize(form.zustaendig),
      zusätzlicheInfos: sanitize(form.zusaetzlicheInfos),
      arbeitsstation: sanitize(form.arbeitsstation),
      status: sanitize(form.status) ?? "NEU",
      statusCode: sanitize(form.status) ?? "NEU",
      fai: !!form.fai,
      qs: !!form.qs,
      stk: Number.isFinite(Number(form.stk)) ? Number(form.stk) : undefined,
      fa: sanitize(form.fa),
      dateipfad: sanitize(form.dateipfad)
    };
    Object.keys(payload).forEach((k) => { if (payload[k] == null) delete payload[k]; });
    return payload;
  };

  /** Speichern (einmaliger Patch) */
  const handleSave = async () => {
    if (!form.id) { toast.error("Ungültige Task-ID"); return; }
    setSubmitting(true);
    try {
      await apiPatch(`/tasks/${form.id}`, buildPayload());
      toast.success("Gespeichert");
      onSave?.();
      onClose?.();
    } catch (err) {
      toast.error("Speichern fehlgeschlagen: " + (err?.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) { toast.error("Ungültige Task-ID"); return; }
    if (!confirm("Diese Aufgabe wirklich löschen?")) return;
    setSubmitting(true);
    try {
      await apiDelete(`/tasks/${form.id}`);
      toast.success("Gelöscht");
      onDeleted?.(form.id);
      onClose?.();
    } catch (err) {
      toast.error("Löschen fehlgeschlagen: " + (err?.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  /** Breadcrumbs aus relativem Unterordner */
  const breadcrumbs = useMemo(() => {
    const raw = (form.dateipfad || "").replaceAll("\\", "/").replace(/^\/+/, "");
    if (!raw) return [];
    const parts = raw.split("/").filter(Boolean);
    let running = "";
    return parts.map((part) => {
      running = running ? `${running}/${part}` : part;
      return { label: part, sub: running };
    });
  }, [form.dateipfad]);

  const DetailsForm = (
    <>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Basisdaten</h3>
        <label style={styles.label} htmlFor="bezeichnung">Bezeichnung *</label>
        <input
          id="bezeichnung"
          type="text"
          style={styles.input}
          value={form.bezeichnung}
          onChange={(e) => setValue("bezeichnung", e.target.value)}
          disabled={submitting}
          required
        />
        <div style={{ height: 10 }} />
        <div style={styles.grid2}>
          <div>
            <label style={styles.label} htmlFor="teilenummer">Teilenummer</label>
            <input
              id="teilenummer"
              type="text"
              style={styles.input}
              value={form.teilenummer}
              onChange={(e) => setValue("teilenummer", e.target.value)}
              disabled={submitting}
            />
          </div>
          <div>
            <label style={styles.label} htmlFor="kunde">Kunde</label>
            <input
              id="kunde"
              type="text"
              style={styles.input}
              value={form.kunde}
              onChange={(e) => setValue("kunde", e.target.value)}
              disabled={submitting}
            />
          </div>
          <div>
            <label style={styles.label} htmlFor="endDatum">Enddatum</label>
            <input
              id="endDatum"
              type="date"
              style={styles.input}
              value={form.endDatum || ""}
              onChange={(e) => setValue("endDatum", e.target.value)}
              disabled={submitting}
            />
          </div>
          <div>
            <label style={styles.label} htmlFor="aufwandStunden">Aufwand (Std.)</label>
            <input
              id="aufwandStunden"
              type="number"
              min="0"
              step="0.25"
              style={styles.input}
              value={form.aufwandStunden}
              onChange={(e) => setValue("aufwandStunden", e.target.value)}
              disabled={submitting}
            />
          </div>
          <div>
            <label style={styles.label} htmlFor="stk">Stk</label>
            <input
              id="stk"
              type="number"
              min="0"
              step="1"
              style={styles.input}
              value={form.stk}
              onChange={(e) => setValue("stk", e.target.value)}
              disabled={submitting}
            />
          </div>
          <div>
            <label style={styles.label} htmlFor="fa">FA (Fertigungsauftrag-Nr.)</label>
            <input
              id="fa"
              type="text"
              style={styles.input}
              value={form.fa}
              onChange={(e) => setValue("fa", e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Zuweisung & Status</h3>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label} htmlFor="zustaendig">Zuständigkeit</label>
            <input
              id="zustaendig"
              type="text"
              style={styles.input}
              value={form.zustaendig}
              onChange={(e) => setValue("zustaendig", e.target.value)}
              disabled={submitting}
            />
          </div>
          <div>
            <label style={styles.label} htmlFor="arbeitsstation">Arbeitsstation *</label>
            <select
              id="arbeitsstation"
              style={styles.input}
              value={form.arbeitsstation}
              onChange={(e) => setValue("arbeitsstation", e.target.value)}
              disabled={submitting}
              required
            >
              {stations.map((s) => (
                <option key={s.id ?? s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ height: 10 }} />
        <div>
          <label className="form-label">Status</label>
          <div style={{ position:'relative', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {/* Pill-Button */}
            <button
              ref={statusBtnRef}
              type="button"
              onClick={() => (statusMenuOpen ? closeStatusMenu() : openStatusMenu())}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!statusMenuOpen) openStatusMenu();
                }
              }}
              className="pill"
              style={{
                ...statusStyles.pillBase,
                backgroundColor: (currentStatus?.colorBg ?? '#26303f'),
                color: (currentStatus?.colorFg ?? '#e5e7eb'),
                border: '1px solid #ffffff22'
              }}
              aria-haspopup="menu"
              aria-expanded={statusMenuOpen}
              title={currentStatus ? currentStatus.label : form.status}
            >
              <span style={{ width:8, height:8, borderRadius:999, backgroundColor:'#8df58d' }} />
              <span>{currentStatus ? currentStatus.label : form.status}</span>
              <span style={{ opacity:.75 }}>▾</span>
            </button>

            {/* Dropdown */}
            {statusMenuOpen && (
              <div
                ref={statusMenuRef}
                role="menu"
                tabIndex={-1}
                style={{ ...statusStyles.menu, top:'calc(100% + 6px)', left:0 }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { e.preventDefault(); closeStatusMenu(); }
                  else if (e.key === 'ArrowDown') { e.preventDefault(); move(+1); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
                  else if (e.key === 'Enter') { e.preventDefault(); choose(hi); }
                }}
              >
                {visibleList.map((s, idx) => {
                  const active = hi === idx;
                  const disabled = !s.active;
                  return (
                    <button
                      key={s.code}
                      role="menuitem"
                      onMouseEnter={() => setHi(idx)}
                      onClick={() => choose(idx)}
                      disabled={disabled}
                      title={disabled ? 'Inaktiv (nicht auswählbar)' : (s.isFinal ? 'Finaler Status' : s.label)}
                      style={statusStyles.menuItem(active, disabled, { bg: s.colorBg, fg: s.colorFg })}
                    >
                      <span style={statusStyles.dot(s.colorFg)} />
                      <span style={{ flex:1 }}>{s.label}</span>
                      {s.isFinal && (
                        <span style={{ fontSize:11, opacity:.85, border:'1px solid #ffffff33', borderRadius:999, padding:'2px 6px' }}>
                          final
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

			{/* Zusatzarbeiten (FAI/QS) – rechts ausgerichtet */}
			<div style={{ marginLeft: "auto", display: "inline-flex", gap: 8, alignItems: "center" }}>
			  <span style={{ fontSize: 12, color: "#94a3b8" }}>Zusatzarbeiten:</span>

			  <button
			    type="button"
			    className={`pill-add add-fai ${form.fai ? "is-active" : ""} is-clickable`}
			    onClick={() => setForm((prev) => ({ ...prev, fai: !prev.fai }))}
			    disabled={submitting}
			    aria-pressed={!!form.fai}
			    title="FAI"
			  >
			    FAI
			  </button>

			  <button
			    type="button"
			    className={`pill-add add-qs ${form.qs ? "is-active" : ""} is-clickable`}
			    onClick={() => setForm((prev) => ({ ...prev, qs: !prev.qs }))}
			    disabled={submitting}
			    aria-pressed={!!form.qs}
			    title="QS"
			  >
			    QS
			  </button>
			</div>

			
			
            {statusErr && <div style={{ marginTop:6, color:'#fecaca', fontSize:12 }}>{statusErr}</div>}
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Beschreibung</h3>
        <label style={styles.label} htmlFor="zusaetzlicheInfos">Zusätzliche Infos</label>
        <textarea
          id="zusaetzlicheInfos"
          style={{ ...styles.input, ...styles.textarea }}
          value={form.zusaetzlicheInfos}
          onChange={(e) => setValue("zusaetzlicheInfos", e.target.value)}
          disabled={submitting}
          placeholder="Optional: Kurzbeschreibung"
        />
      </div>
    </>
  );

  const PathForm = (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>Dateipfad</h3>

      <label style={styles.label} htmlFor="dateipfad">Unterordner gegenüber Basis</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="dateipfad"
          type="text"
          style={{ ...styles.input, flex: 1 }}
          value={form.dateipfad}
          onChange={(e) => setValue("dateipfad", e.target.value.replaceAll("\\", "/"))}
          disabled={submitting}
          placeholder="z. B. Kunde/Projekt/Teil"
        />
        <button
          type="button"
          style={styles.btnSecondary}
          onClick={() => setShowFolderPicker(true)}
          disabled={submitting}
        >
          Ordner wählen…
        </button>
        <button
          type="button"
          style={styles.btnSecondary}
          onClick={async () => {
            try {
              const exists = await fsExists(form.dateipfad || "");
              if (exists) toast.success("Pfad vorhanden");
              else toast.error("Pfad existiert nicht");
            } catch {
              toast.error("Prüfung fehlgeschlagen");
            }
          }}
          disabled={submitting}
        >
          Prüfen
        </button>
      </div>

      {(baseLabel || DEFAULT_BASE_LABEL) && (
        <div style={{ marginTop: 8, ...styles.muted }}>
          Voller Pfad (Info):{" "}
          <code>{joinBaseAndSub(baseLabel || DEFAULT_BASE_LABEL, form.dateipfad?.replaceAll("\\", "/"))}</code>
        </div>
      )}

      {/* Breadcrumbs */}
      <div aria-label="Pfad-Navigation" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 10 }}>
        <span>
          <button
            type="button"
            onClick={() => setValue("dateipfad", "")}
            title={baseLabel || DEFAULT_BASE_LABEL}
            style={styles.crumbBtn}
            disabled={submitting}
          >
            Basis
          </button>
        </span>
        {breadcrumbs.length > 0 && <span style={styles.crumbSep}>/</span>}
        {breadcrumbs.map((b, idx) => (
          <span key={b.sub} style={{ display: "inline-flex", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setValue("dateipfad", b.sub)}
              title={joinBaseAndSub(baseLabel || DEFAULT_BASE_LABEL, b.sub)}
              style={styles.crumbBtn}
              disabled={submitting}
            >
              {b.label}
            </button>
            {idx < breadcrumbs.length - 1 && <span style={styles.crumbSep}>/</span>}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 8, ...styles.muted }}>
        Hinweis: Basispräfix wird serverseitig konfiguriert (z. B. <code>\\\\server\\share\\</code>). Hier nur den <em>Unterordner</em> wählen/eintragen.
      </div>
    </div>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Aufgabe bearbeiten</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </div>

        <div style={styles.tabsRow}>
          <button type="button" style={styles.tabBtn(activeTab === "details")} onClick={() => setActiveTab("details")}>
            Details
          </button>
          <button type="button" style={styles.tabBtn(activeTab === "path")} onClick={() => setActiveTab("path")}>
            Pfad
          </button>
          <button type="button" style={styles.tabBtn(activeTab === "attachments")} onClick={() => setActiveTab("attachments")}>
            Anhänge
          </button>
        </div>

        {activeTab === "details" ? (
          DetailsForm
        ) : activeTab === "path" ? (
          PathForm
        ) : (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Anhänge</h3>
            {!task?.id ? (
              <div style={{ color: "#9ca3af" }}>
                Bitte zuerst speichern. Anhänge sind erst für bestehende Tasks verfügbar.
              </div>
            ) : (
              <AttachmentTab taskId={task.id} />
            )}
          </div>
        )}

        <div style={styles.footer}>
          <button type="button" style={styles.btnDanger} onClick={handleDelete} disabled={submitting}>
            Löschen
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={styles.btnSecondary} onClick={onClose} disabled={submitting}>
              Abbrechen
            </button>
            <button type="button" style={styles.btnPrimary} onClick={handleSave} disabled={submitting}>
              {submitting ? "Speichere…" : "Speichern"}
            </button>
          </div>
        </div>
      </div>

      {showFolderPicker && (
        <FolderPickerModal
          initialSub={form.dateipfad || ""}
          onSelect={(sub) => {
            setValue("dateipfad", sub?.replaceAll("\\", "/") || "");
            setShowFolderPicker(false);
          }}
          onClose={() => setShowFolderPicker(false)}
          title="Unterordner wählen"
          baseLabel={baseLabel || DEFAULT_BASE_LABEL}
        />
      )}
    </div>
  );
}
