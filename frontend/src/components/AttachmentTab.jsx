import { useEffect, useState } from "react";
import { AttachmentsApi } from "../api/attachmentsApi";

export default function AttachmentTab({ taskId, toast }){
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load(){
    setLoading(true); setError(null);
    try{ const data = await AttachmentsApi.list(taskId); setList(data); }
    catch(e){ setError(e); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ if(taskId) load(); }, [taskId]);

  async function onUpload(e){
    const file = e.target.files?.[0]; if(!file) return;
    try{
      await AttachmentsApi.upload(taskId, file);
      toast?.success?.("Anhang hochgeladen");
      load();
    }catch(err){
      toast?.error?.(err.message || "Upload fehlgeschlagen");
    }finally{
      e.target.value = "";
    }
  }

  async function onDelete(id){
    try{
      await AttachmentsApi.remove(taskId, id);
      toast?.success?.("Anhang gelöscht");
      setList(prev => prev.filter(a => a.id !== id));
    }catch(err){
      toast?.error?.(err.message || "Löschen fehlgeschlagen");
    }
  }

  if(error) return <div style={{color:"#b91c1c"}}>{error.message}</div>;

  return (
    <div>
      <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
        <input type="file" onChange={onUpload} />
      </div>
      {loading ? <div>lade…</div> : (
        <ul style={{listStyle:"none", padding:0, margin:0}}>
          {list.map(a => (
            <li key={a.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #e5e7eb"}}>
              <span>{a.filename} <small>({Math.round(a.size/1024)} KB)</small></span>
              <span style={{display:"flex", gap:8}}>
                <a href={a.downloadUrl} target="_blank" rel="noreferrer">Öffnen</a>
                <button onClick={()=>onDelete(a.id)}>Löschen</button>
              </span>
            </li>
          ))}
          {list.length === 0 && <li style={{color:"#64748b"}}>Keine Anhänge</li>}
        </ul>
      )}
    </div>
  );
}
