import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle, AlertTriangle, Search, Users, Loader2, MapPin } from "lucide-react";
import api from "../api/client";
import type { PickupRequest, PickupSession } from "../types";
import { useWS } from "../hooks/useWS";
import toast from "react-hot-toast";

const WS = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";

export default function Queue() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sf, setSf]         = useState("active");

  const { data: session } = useQuery<PickupSession>({
    queryKey: ["session", id],
    queryFn: () => api.get(`/pickups/sessions/${id}/`).then(r => r.data),
    enabled: !!id,
  });
  const { data: requests = [], isLoading } = useQuery<PickupRequest[]>({
    queryKey: ["queue", id],
    queryFn: () => api.get(`/pickups/requests/?session=${id}`).then(r => Array.isArray(r.data) ? r.data : (r.data.results ?? [])),
    refetchInterval: 20_000,
    retry: 1,
    retryDelay: 3000, enabled: !!id,
  });

  const onMsg = useCallback((msg: unknown) => {
    const m = msg as { type: string; requests?: PickupRequest[] };
    if (m.type === "queue_state" && m.requests) qc.setQueryData(["queue", id], m.requests);
  }, [qc, id]);
  useWS(`${WS}/ws/queue/${id}/`, onMsg, !!id);

  const callMut = useMutation({
    mutationFn: (rid: string) => api.post(`/pickups/requests/${rid}/call/`),
    onSuccess: (_, rid) => {
      qc.invalidateQueries({ queryKey: ["queue", id] });
      const r = requests.find(x => x.id === rid);
      toast.success(`ðŸ“¢ Called: ${r?.collector_name} â€” ${r?.queue_token}`);
    },
    onError: () => toast.error("Failed to call. Try again."),
  });
  const doneMut = useMutation({
    mutationFn: (rid: string) => api.post(`/pickups/requests/${rid}/complete/`, { method: "manual" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["queue",id] }); toast.success("âœ… Collected"); },
    onError: () => toast.error("Failed to confirm."),
  });

  const filtered = requests.filter(r => {
    const ms = search==="" || r.collector_name.toLowerCase().includes(search.toLowerCase()) ||
               r.queue_token.toLowerCase().includes(search.toLowerCase()) ||
               r.children.some(c => c.student.full_name.toLowerCase().includes(search.toLowerCase()));
    const mf = sf==="active" ? ["arrived","in_queue","called"].includes(r.status)
             : sf==="all"    ? true : r.status === sf;
    return ms && mf;
  });

  const cnt = {
    q: requests.filter(r => ["arrived","in_queue"].includes(r.status)).length,
    c: requests.filter(r => r.status === "called").length,
    d: requests.filter(r => r.status === "collected").length,
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">{session?.session_type.replace(/_/g," ").toUpperCase() ?? "Queue"}</h1>
          <div className="flex items-center gap-2 mt-1">
            {session?.status==="active" && <><span className="live-dot"/><span className="text-jade text-sm ml-1">Live</span></>}
            <span className="muted text-sm">{session?.scheduled_start}â€“{session?.scheduled_end}</span>
          </div>
        </div>
        <div className="flex gap-5">
          {[{l:"Queue",v:cnt.q,c:"text-jade"},{l:"Called",v:cnt.c,c:"text-orange-400"},{l:"Done",v:cnt.d,c:"text-jade-light"}].map(x => (
            <div key={x.l} className="text-center"><p className={`font-display font-bold text-2xl ${x.c}`}>{x.v}</p><p className="muted text-xs">{x.l}</p></div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} className="input pl-10 text-sm" placeholder="Search name, token, childâ€¦"/>
        </div>
        <select value={sf} onChange={e=>setSf(e.target.value)} className="input w-auto text-sm">
          <option value="active">Active queue</option>
          <option value="all">All</option>
          <option value="called">Called</option>
          <option value="collected">Collected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={26} className="animate-spin text-jade"/></div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map(req => (
              <motion.div key={req.id} layout
                initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,x:40}}
                transition={{duration:0.2}}
                className={`card relative overflow-hidden transition-colors ${req.status==="called"?"border-orange-500/38 bg-orange-500/5":req.ai_flagged?"border-rose/38 bg-rose/4":""}`}>
                {req.status==="called" && <div className="absolute inset-x-0 top-0 h-px" style={{background:"linear-gradient(90deg,transparent,rgba(249,115,22,0.8),transparent)"}}/>}
                {req.ai_flagged && (
                  <div className="absolute top-3 right-3">
                    <span className="badge badge-no_show flex items-center gap-1"><AlertTriangle size={9}/>{req.ai_risk_level} risk</span>
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className="text-center shrink-0 min-w-[56px]">
                    <p className="font-mono font-bold text-2xl text-jade leading-none">{req.queue_token}</p>
                    <p className="muted text-xs mt-1">#{req.queue_position??"-"}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="text-white font-medium text-sm">{req.collector_name}</p>
                      <span className={`badge badge-${req.status}`}>{req.status.replace("_"," ")}</span>
                      {req.checkin_dist!=null && <span className="muted text-xs flex items-center gap-1"><MapPin size={9}/>{Math.round(req.checkin_dist)}m</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {req.children.map(c => (
                        <div key={c.id} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor:c.student.year_group_colour}}/>
                          <span className="text-white/80">{c.student.full_name}</span>
                          <span className="text-slate">{c.student.year_group_name}</span>
                          {c.is_ready && <CheckCircle size={9} className="text-jade"/>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {["arrived","in_queue"].includes(req.status) && (
                      <button onClick={()=>callMut.mutate(req.id)} disabled={callMut.isPending} className="btn-primary btn-sm"><Bell size={12}/> Call</button>
                    )}
                    {req.status==="called" && (
                      <button onClick={()=>doneMut.mutate(req.id)} disabled={doneMut.isPending} className="btn-success btn-sm"><CheckCircle size={12}/> Done</button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length===0 && !isLoading && (
            <div className="text-center py-16"><Users size={34} className="text-slate/22 mx-auto mb-3"/><p className="muted">No requests match</p></div>
          )}
        </div>
      )}
    </div>
  );
}