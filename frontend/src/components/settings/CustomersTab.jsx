import React, { useEffect, useMemo, useState } from "react";
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/api/customers";
import useToast from "@/components/ui/useToast";

const styles = {
  wrap: { background:"#0f172a", color:"#e5e7eb", border:"1px solid #1f2937", borderRadius:12, padding:16 },
  row: { display:"grid", gridTemplateColumns:"1fr 120px 140px 120px", gap:8, alignItems:"center", padding:"8px 0", borderBottom:"1px dashed #1f2937" },
  head: { fontSize:12, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".06em" },
  input: { width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #334155", background:"#111827", color:"#e5e7eb" },
  btn: { padding:"8px 12px", borderRadius:8, border:"1px solid #334155", background:"transparent", color:"#e5e7eb", cursor:"pointer" },
  btnPri: { padding:"8px 12px", borderRadius:8, border:"1px solid #3b82f6", background:"#3b82f6", color:"#fff", cursor:"pointer", fontWeight:700 },
  pill: (on)=>({ padding:"4px 10px", borderRadius:999, border:"1px solid #334155", background:on?"#12325b":"#1f2937", color:"#e5e7eb", cursor:"pointer", textAlign:"center" }),
  toolbar:{ display:"flex", gap:8, marginBottom:12, alignItems:"center" },
  sep:{ height:1, background:"#1f2937", margin:"8px 0" }
};

export default function CustomersTab() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Edit inline state: { [id]: {name, active, dirty} }
  const [edits, setEdits] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomers(!activeOnly); // activeOnly=false => alle
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Kunden laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeOnly]);

  const sorted = useMemo(() => {
    const arr = [...list];
    // aktiv zuerst, dann inaktiv; danach alphabetisch
    arr.sort((a,b) => (b.active - a.active) || String(a.name).localeCompare(String(b.name)));
    return activeOnly ? arr.filter(x => x.active) : arr;
  }, [list, activeOnly]);

  const startEdit = (c) => {
    setEdits(prev => ({ ...prev, [c.id]: { name: c.name, active: !!c.active, dirty:false }}));
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
      await updateCustomer(id, { name: e.name, active: e.active });
      toast.success("Kunde aktualisiert");
      cancelEdit(id);
      await load();
    } catch (err) {
      toast.error("Aktualisierung fehlgeschlagen");
    }
  };

  const remove = async (id) => {
    if (!confirm("Kunde wirklich löschen?")) return;
    try {
      await deleteCustomer(id);
      toast.success("Kunde gelöscht");
      await load();
    } catch (err) {
      toast.error("Löschen fehlgeschlagen");
    }
  };

  const create = async () => {
    if (!newName.trim()) { toast.error("Name erforderlich"); return; }
    setSubmitting(true);
    try {
      await createCustomer({ name: newName.trim(), active: !!newActive });
      setNewName(""); setNewActive(true);
      toast.success("Kunde angelegt");
      await load();
    } catch (err) {
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
          title="Alle Kunden anzeigen"
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
        <div style={styles.head}>Status</div>
        <div style={styles.head}>Aktion</div>
        <div style={styles.head}>Löschen</div>
      </div>

      {/* Create Row */}
      <div style={styles.row}>
        <input
          style={styles.input}
          placeholder="Neuer Kunde…"
          value={newName}
          onChange={(e)=>setNewName(e.target.value)}
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
        <div style={{padding:"12px 0", color:"#9ca3af"}}>Keine Kunden vorhanden.</div>
      ) : (
        sorted.map(c => {
          const e = edits[c.id];
          return (
            <div key={c.id} style={styles.row}>
              {/* Name */}
              {e ? (
                <input
                  style={styles.input}
                  value={e.name}
                  onChange={(ev)=>changeEdit(c.id, { name: ev.target.value })}
                />
              ) : (
                <div>{c.name}</div>
              )}

              {/* Status */}
              {e ? (
                <select
                  value={e.active ? "1" : "0"}
                  onChange={(ev)=>changeEdit(c.id, { active: ev.target.value === "1" })}
                  style={styles.input}
                >
                  <option value="1">aktiv</option>
                  <option value="0">inaktiv</option>
                </select>
              ) : (
                <div>{c.active ? "aktiv" : "inaktiv"}</div>
              )}

              {/* Aktion */}
              <div style={{ display:"flex", gap:8 }}>
                {e ? (
                  <>
                    <button style={styles.btnPri} onClick={()=>saveEdit(c.id)} disabled={!e.dirty}>Speichern</button>
                    <button style={styles.btn} onClick={()=>cancelEdit(c.id)}>Abbrechen</button>
                  </>
                ) : (
                  <button style={styles.btn} onClick={()=>startEdit(c)}>Bearbeiten</button>
                )}
              </div>

              {/* Löschen */}
              <div>
                <button style={styles.btn} onClick={()=>remove(c.id)}>Löschen</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
