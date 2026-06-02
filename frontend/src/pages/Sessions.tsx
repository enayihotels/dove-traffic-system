import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Play, Square, Calendar, Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import api from "../api/client";
import type { PickupSession } from "../types";
import toast from "react-hot-toast";

export default function Sessions() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ session_type:"primary_pm", date:format(new Date(),"yyyy-MM-dd"), scheduled_start:"15:00", scheduled_end:"15:30" });

  const { data: sessions = [], isLoading } = useQuery<PickupSession[]>({
    queryKey: ["all-sessions"],
    queryFn: () => api.get("/pickups/sessions/?status=all").then(r => Array.isArray(r.data) ? r.data : (r.data.results ?? [])),
    refetchInterval: 20_000,
  });

  const inv = () => { qc.invalidateQueries({ queryKey:["all-sessions"] }); qc.invalidateQueries({ queryKey:["sessions"] }); };
  const create   = useMutation({ mutationFn: () => api.post("/pickups/sessions/", form),     onSuccess: () => { inv(); setOpen(false); toast.success("Session created"); } });
  const activate = useMutation({ mutationFn: (id:string) => api.post(`/pickups/sessions/${id}/open/`),     onSuccess: () => { inv(); toast.success("Session opened"); } });
  const start    = useMutation({ mutationFn: (id:string) => api.post(`/pickups/sessions/${id}/activate/`), onSuccess: () => { inv(); toast.success("Dismissal started"); } });
  const close    = useMutation({ mutationFn: (id:string) => api.post(`/pickups/sessions/${id}/close/`),    onSuccess: () => { inv(); toast.success("Session closed"); } });

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Sessions</h1><p className="muted mt-1">Manage daily pickup sessions</p></div>
        <button onClick={() => setOpen(!open)} className="btn-primary btn-md"><Plus size={15}/> New Session</button>
      </div>

      {open && (
        <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} className="card border-jade/28 bg-jade/4">
          <h3 className="section-title mb-4">Create Session</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:"Type",  key:"session_type", type:"select", opts:[["eyfs_am","EYFS Morning"],["eyfs_pm","EYFS Afternoon"],["primary_pm","Primary Afternoon"],["extra","Extra"]] },
              { label:"Date",  key:"date",             type:"date" },
              { label:"Start", key:"scheduled_start",  type:"time" },
              { label:"End",   key:"scheduled_end",    type:"time" },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                {f.type==="select" ? (
                  <select className="input" value={(form as any)[f.key]} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}>
                    {(f.opts ?? []).map((opt) => <option key={opt[0]} value={opt[0]}>{opt[1]}</option>)}                  </select>
                ) : (
                  <input type={f.type} className="input" value={(form as any)[f.key]} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))} />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => create.mutate()} disabled={create.isPending} className="btn-primary btn-md">
              {create.isPending ? <Loader2 size={14} className="animate-spin"/> : <Calendar size={14}/>} Create
            </button>
            <button onClick={() => setOpen(false)} className="btn-secondary btn-md">Cancel</button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={26} className="animate-spin text-jade"/></div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-12"><Calendar size={34} className="text-slate/25 mx-auto mb-3"/><p className="muted">No sessions yet</p></div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="card flex items-center gap-3 px-5 py-4">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.status==="active"?"bg-jade animate-pulse":s.status==="open"?"bg-amber":s.status==="closed"?"bg-white/20":"bg-rose"}`}/>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={()=>navigate(`/queue/${s.id}`)}>
                <p className="text-white font-medium text-sm">{s.session_type.replace(/_/g," ").toUpperCase()}</p>
                <p className="muted text-xs">{s.date} Â· {s.scheduled_start}â€“{s.scheduled_end}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${s.status==="active"?"badge-called":s.status==="open"?"badge-pending":s.status==="closed"?"badge-collected":"badge-cancelled"}`}>{s.status}</span>
                {s.status==="scheduled" && <button onClick={()=>activate.mutate(s.id)} className="btn-secondary btn-sm"><Play size={12}/> Open</button>}
                {s.status==="open"      && <button onClick={()=>start.mutate(s.id)}    className="btn-primary btn-sm"><Play size={12}/> Start</button>}
                {s.status==="active"    && <button onClick={()=>close.mutate(s.id)}    className="btn-danger btn-sm"><Square size={12}/> Close</button>}
                <ArrowRight size={13} className="text-slate/40 cursor-pointer" onClick={()=>navigate(`/queue/${s.id}`)}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}