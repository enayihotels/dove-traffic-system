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

// Status display config
const STATUS_LABEL: Record<string, string> = {
  pending:    "Pending",
  en_route:   "En Route",
  arrived:    "Arrived",
  in_queue:   "In Queue",
  called:     "Called",
  collected:  "Collected",
  no_show:    "No Show",
};
const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-slate-500/20  text-slate-300  border-slate-500/30",
  en_route:  "bg-blue-500/20   text-blue-300   border-blue-500/30",
  arrived:   "bg-amber-500/20  text-amber-300  border-amber-500/30",
  in_queue:  "bg-amber-500/20  text-amber-300  border-amber-500/30",
  called:    "bg-orange-500/20 text-orange-300 border-orange-500/30",
  collected: "bg-jade/20       text-jade       border-jade/30",
  no_show:   "bg-rose-500/20   text-rose-300   border-rose-500/30",
};

export default function Queue() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  // Default to "all" so every checked-in parent is visible immediately
  const [sf, setSf] = useState("all");

  const { data: session } = useQuery<PickupSession>({
    queryKey: ["session", id],
    queryFn: () => api.get(`/pickups/sessions/${id}/`).then(r => r.data),
    enabled: !!id,
  });

  const { data: requests = [], isLoading } = useQuery<PickupRequest[]>({
    queryKey: ["queue", id],
    queryFn: () =>
      api.get(`/pickups/requests/?session=${id}`)
        .then(r => Array.isArray(r.data) ? r.data : (r.data.results ?? [])),
    refetchInterval: 20_000,
    retry: 1,
    retryDelay: 3000,
    enabled: !!id,
  });

  const onMsg = useCallback((msg: unknown) => {
    const m = msg as { type: string; requests?: PickupRequest[] };
    if (m.type === "queue_state" && m.requests)
      qc.setQueryData(["queue", id], m.requests);
  }, [qc, id]);
  useWS(`${WS}/ws/queue/${id}/`, onMsg, !!id);

  // Call parent  -  sends notification
  const callMut = useMutation({
    mutationFn: (rid: string) => api.post(`/pickups/requests/${rid}/call/`),
    onSuccess: (_, rid) => {
      qc.invalidateQueries({ queryKey: ["queue", id] });
      const r = requests.find(x => x.id === rid);
      toast.success(`📢 Called: ${r?.collector_name}  -  ${r?.queue_token}`);
    },
    onError: () => toast.error("Failed to call. Try again."),
  });

  // Mark as collected
  const doneMut = useMutation({
    mutationFn: (rid: string) => api.post(`/pickups/requests/${rid}/complete/`, { method: "manual" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue", id] });
      toast.success("✅ Marked as collected");
    },
    onError: () => toast.error("Failed to mark collected."),
  });

  // Filter requests
  const filtered = requests.filter(r => {
    const matchSearch =
      search === "" ||
      r.collector_name.toLowerCase().includes(search.toLowerCase()) ||
      r.queue_token.toLowerCase().includes(search.toLowerCase()) ||
      r.children.some(c => c.student.full_name.toLowerCase().includes(search.toLowerCase()));

    const matchFilter =
      sf === "all"       ? true :
      sf === "waiting"   ? ["pending","en_route","arrived","in_queue"].includes(r.status) :
      sf === "active"    ? ["arrived","in_queue","called"].includes(r.status) :
      sf === "called"    ? r.status === "called" :
      sf === "collected" ? r.status === "collected" :
      true;

    return matchSearch && matchFilter;
  });

  // Counts
  const cnt = {
    waiting:   requests.filter(r => ["pending","en_route","arrived","in_queue"].includes(r.status)).length,
    called:    requests.filter(r => r.status === "called").length,
    collected: requests.filter(r => r.status === "collected").length,
    total:     requests.length,
  };

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">
            {session?.session_type.replace(/_/g, " ").toUpperCase() ?? "Queue"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {session?.status === "active" && (
              <><span className="live-dot"/><span className="text-jade text-sm ml-1">Live</span></>
            )}
            <span className="muted text-sm">
              {session?.scheduled_start}-{session?.scheduled_end}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-5">
          {[
            { l: "Waiting",   v: cnt.waiting,   c: "text-amber"      },
            { l: "Called",    v: cnt.called,     c: "text-orange-400" },
            { l: "Collected", v: cnt.collected,  c: "text-jade"       },
            { l: "Total",     v: cnt.total,      c: "text-white"      },
          ].map(x => (
            <div key={x.l} className="text-center">
              <p className={`font-display font-bold text-2xl ${x.c}`}>{x.v}</p>
              <p className="muted text-xs">{x.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate/60 pointer-events-none"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 bg-night-100 border border-white/10 rounded-xl pl-10 pr-4 text-white text-sm placeholder:text-slate/50 outline-none focus:border-jade/50 focus:ring-1 focus:ring-jade/30"
            placeholder="Search name, token, child…"
          />
        </div>
        <select
          value={sf}
          onChange={e => setSf(e.target.value)}
          className="h-10 bg-night-100 border border-white/10 rounded-xl px-3 text-white text-sm outline-none focus:border-jade/50 min-w-[140px]"
        >
          <option value="all">All ({cnt.total})</option>
          <option value="waiting">Waiting ({cnt.waiting})</option>
          <option value="called">Called ({cnt.called})</option>
          <option value="collected">Collected ({cnt.collected})</option>
        </select>
      </div>

      {/* How-to hint */}
      {cnt.waiting > 0 && cnt.called === 0 && (
        <div className="rounded-xl border border-jade/20 bg-jade/5 px-4 py-3 text-jade/80 text-sm flex items-center gap-2">
          <Bell size={14} className="shrink-0"/>
          <span>
            <strong className="text-jade">To notify a parent:</strong> find their token below and click
            the <strong className="text-jade">📢 Call</strong> button. Then click
            <strong className="text-jade"> ✅ Done</strong> once the child is collected.
          </span>
        </div>
      )}

      {/* Request cards */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={26} className="animate-spin text-jade"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={34} className="text-slate/22 mx-auto mb-3"/>
          <p className="muted">
            {requests.length === 0
              ? "No parents have checked in yet"
              : "No requests match your filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map(req => (
              <motion.div key={req.id} layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.2 }}
                className={`card relative overflow-hidden transition-colors
                  ${req.status === "called"
                    ? "border-orange-500/40 bg-orange-500/5"
                    : req.ai_flagged
                    ? "border-rose/40 bg-rose/5"
                    : req.status === "collected"
                    ? "border-white/5 opacity-60"
                    : "border-white/8"}`}>

                {req.status === "called" && (
                  <div className="absolute inset-x-0 top-0 h-0.5"
                    style={{ background: "linear-gradient(90deg,transparent,rgba(249,115,22,0.9),transparent)" }}/>
                )}

                {req.ai_flagged && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose/20 text-rose border border-rose/30">
                      <AlertTriangle size={9}/> {req.ai_risk_level} risk
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Token */}
                  <div className="text-center shrink-0 min-w-[60px]">
                    <p className="font-mono font-bold text-2xl text-jade leading-none">
                      {req.queue_token}
                    </p>
                    <p className="muted text-xs mt-1">#{req.queue_position ?? "-"}</p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="text-white font-medium text-sm">{req.collector_name}</p>
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[req.status] ?? STATUS_COLOR.pending}`}>
                        {STATUS_LABEL[req.status] ?? req.status}
                      </span>
                      {req.checkin_dist != null && (
                        <span className="muted text-xs flex items-center gap-1">
                          <MapPin size={9}/>{Math.round(req.checkin_dist)}m away
                        </span>
                      )}
                    </div>
                    {/* Children */}
                    <div className="flex flex-wrap gap-1.5">
                      {req.children.map(c => (
                        <div key={c.id}
                          className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: c.student.year_group_colour }}/>
                          <span className="text-white/85">{c.student.full_name}</span>
                          <span className="text-slate/70">{c.student.year_group_name}</span>
                          {c.is_ready && <CheckCircle size={9} className="text-jade"/>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {/* CALL button  -  for pending/en_route/arrived/in_queue */}
                    {["pending","en_route","arrived","in_queue"].includes(req.status) && (
                      <button
                        onClick={() => callMut.mutate(req.id)}
                        disabled={callMut.isPending}
                        className="inline-flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-xs font-semibold px-3 py-2 rounded-lg border border-amber-500/30 transition-colors">
                        {callMut.isPending
                          ? <Loader2 size={12} className="animate-spin"/>
                          : <Bell size={12}/>}
                        📢 Call
                      </button>
                    )}
                    {/* DONE button  -  for called */}
                    {req.status === "called" && (
                      <button
                        onClick={() => doneMut.mutate(req.id)}
                        disabled={doneMut.isPending}
                        className="inline-flex items-center gap-1.5 bg-jade/20 hover:bg-jade/35 text-jade text-xs font-semibold px-3 py-2 rounded-lg border border-jade/30 transition-colors">
                        {doneMut.isPending
                          ? <Loader2 size={12} className="animate-spin"/>
                          : <CheckCircle size={12}/>}
                        ✅ Done
                      </button>
                    )}
                    {/* Collected badge */}
                    {req.status === "collected" && (
                      <span className="inline-flex items-center gap-1 text-jade/60 text-xs">
                        <CheckCircle size={12}/> Collected
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
