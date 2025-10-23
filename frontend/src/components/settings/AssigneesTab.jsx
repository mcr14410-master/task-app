import React, { useEffect, useMemo, useState } from "react";
import { fetchAssignees, createAssignee, updateAssignee, deleteAssignee } from "@/api/assignees";
import useToast from "@/components/ui/useToast";

const styles = {
  wrap: { background:"#0f172a", color:"#e5e7eb", border:"1px solid #1f2937", borderRadius:12, padding:16 },
  row: { display:"grid", gridTemplateColumns:"1fr 1fr 120px 140px 120px", gap:8, alignItems:"center", padding:"8px 0", borderBottom:"1px dashed #1f2937" },
  head: { fontSize:12, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".06em" },
  input: { width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #334155", background:"#111827", color:"#e5e7eb" },
  btn: { padding:"8px 12px", borderRadius:8, border:"1px solid #334155", background:"transparent", color:"#e5e7eb", cursor:"pointer" },
  btnPri: { padding:"8px 12px", borderRadius:8, border:"1px solid #3b82f6", background:"#3b82f6", color:"#fff", cursor:"pointer", fontWeight:700 },
  pill: (on)=>({ padding:"4px 10px", borderRadius:999, border:"1px solid #334155", background:on?"#12325b":"#1f2937", color:"#e5e7eb", cursor:"pointer", textAlign:"center" }),
  toolbar:{ display:"flex", gap:8, marginBottom:12, alignItems:"center" },
  sep:{ height:1, background:"#1f2937", margin:"8px 0" }
};

export default function AssigneesTab() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Edit inline state: { [id]: {name, email, active, dirty} }
  const [edits, setEdits] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAssignees(!activeOnly); // activeOnly=false => alle
      setList(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Zuständigkeiten laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeOnly]);

  const sorted = useMemo(() => {
    const arr = [...list];
    arr.sort((a,b) => (b.active - a.active) || String(a.name).localeCompare(String(b.name)));
    return activeOnly ? arr.filter(x => x.active) : arr;
  }, [list, activeOnly]);

  const startEdit = (a) => {
    setEdits(prev => ({ ...prev, [a.id]: { name: a.name, email: a.email || "", active: !!a.active, dirty:false }}));
  };
  const changeEdit = (id, patch) => {
    setEdits(prev => {
      const cur = prev[id] ?? {};
      const next = { ...cur, ...patch, dirty:true };
      return { ...prev, [id]: next };
    });
  };
  const cancelEdit = (id) => {
    setEdits(prev => { const n = {...prev}; delete n[id]; return n; });
  };

  const saveEdit = async (id) => {
    const e = edits[id]; if (!e) return;
    try {
      await updateAssignee(id, { name: e.name, email: e.email, active: e.active });
      toast.success("Zuständigkeit aktualisiert");
      cancelEdit(id);
      await load();
    } catch {
      toast.error("Aktualisierung fehlgeschlagen");
    }
  };

  const remove = async (id) => {
    if (!confirm("Zuständigkeit wirklich löschen?")) return;
    try {
      await deleteAssignee(id);
      toast.success("Zuständigkeit gelöscht");
      await load();
    } catch {
      toast.error("Löschen fehlgeschlagen");
    }
  };

  const create = async () => {
    if (!newName.trim()) { toast.error("Name erforderlich"); return; }
    setSubmitting(true);
    try {
      await createAssignee({ name: newName.trim(), email: newEmail.trim() || undefined, active: !!newActive });
      setNewName(""); setNewEmail(""); setNewActive(true);
      toast.success("Zuständigkeit angelegt");
      await load();
    } catch {
      toast.error("Anlegen fehlgeschlagen");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.toolbar}>
        <button
          type="button"
          style={styles.pill(!activeOnly)}
          onClick={() => setActiveOnly(false)}
          disabled={loading}
          title="Alle anzeigen"
        >
          Alle
        </button>
        <button
          type="button"
          style={styles.pill(activeOnly)}
          onClick={() => setActiveOnly(true)}
          disabled={loading}
          title="Nur aktive anzeigen"
        >
          Aktiv
        </button>
      </div>

      <div style={{...styles.row, borderBottom:"2px solid #1f2937"}}>
        <div style={styles.head}>Name</div>
        <div style={styles.head}>E-Mail</div>
        <div style={styles.head}>Status</div>
        <div style={styles.head}>Aktion</div>
        <div style={styles.head}>Löschen</div>
      </div>

      {/* Create Row */}
      <div style={styles.row}>
        <input
          style={styles.input}
          placeholder="Neue Zuständigkeit…"
          value={newName}
          onChange={(e)=>setNewName(e.target.value)}
          disabled={submitting}
        />
        <input
          style={styles.input}
          placeholder="optional: email@firma.de"
          value={newEmail}
          onChange={(e)=>setNewEmail(e.target.value)}
          disabled={submitting}
        />
        <select
          value={newActive ? "1" : "0"}
          onChange={(e)=>setNewActive(e.target.value === "1")}
          style={styles.input}
          disabled={submitting}
        >
          <option value="1">aktiv</option>
          <option value="0">inaktiv</option>
        </select>
        <button style={styles.btnPri} onClick={create} disabled={submitting}>Anlegen</button>
        <div />
      </div>

      <div style={styles.sep} />

      {loading ? (
        <div style={{padding:"12px 0", color:"#9ca3af"}}>Lade…</div>
      ) : sorted.length === 0 ? (
        <div style={{padding:"12px 0", color:"#9ca3af"}}>Keine Zuständigkeiten vorhanden.</div>
      ) : (
        sorted.map(a => {
          const e = edits[a.id];
          return (
            <div key={a.id} style={styles.row}>
              {/* Name */}
              {e ? (
                <input
                  style={styles.input}
                  value={e.name}
                  onChange={(ev)=>changeEdit(a.id, { name: ev.target.value })}
                />
              ) : (
                <div>{a.name}</div>
              )}

              {/* Email */}
              {e ? (
                <input
                  style={styles.input}
                  value={e.email}
                  onChange={(ev)=>changeEdit(a.id, { email: ev.target.value })}
                />
              ) : (
                <div>{a.email || <span style={{color:"#6b7280"}}>–</span>}</div>
              )}

              {/* Status */}
              {e ? (
                <select
                  value={e.active ? "1" : "0"}
                  onChange={(ev)=>changeEdit(a.id, { active: ev.target.value === "1" })}
                  style={styles.input}
                >
                  <option value="1">aktiv</option>
                  <option value="0">inaktiv</option>
                </select>
              ) : (
                <div>{a.active ? "aktiv" : "inaktiv"}</div>
              )}

              {/* Aktion */}
              <div style={{ display:"flex", gap:8 }}>
                {e ? (
                  <>
                    <button style={styles.btnPri} onClick={()=>saveEdit(a.id)} disabled={!e.dirty}>Speichern</button>
                    <button style={styles.btn} onClick={()=>cancelEdit(a.id)}>Abbrechen</button>
                  </>
                ) : (
                  <button style={styles.btn} onClick={()=>startEdit(a)}>Bearbeiten</button>
                )}
              </div>

              {/* Löschen */}
              <div>
                <button style={styles.btn} onClick={()=>remove(a.id)}>Löschen</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
