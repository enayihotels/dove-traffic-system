import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Play, Square, Calendar, Loader2, ArrowRight, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import api from "../api/client";
import type { PickupSession } from "../types";
import toast from "react-hot-toast";

export default function Sessions() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    session_type: "primary_pm",
    date: format(new Date(), "yyyy-MM-dd"),
    scheduled_start: "15:00",
    scheduled_end: "15:30",
  });

  const { data: sessions = [], isLoading } = useQuery<PickupSession[]>({
    queryKey: ["all-sessions"],
    queryFn: () =>
      api.get("/pickups/sessions/?status=all").then((r) =>
        Array.isArray(r.data) ? r.data : r.data.results ?? []
      ),
    refetchInterval: 60_000,
    retry: 1,
    retryDelay: 3000,
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["all-sessions"] });
    qc.invalidateQueries({ queryKey: ["sessions"] });
  };

  const create   = useMutation({ mutationFn: () => api.post("/pickups/sessions/", form),                         onSuccess: () => { inv(); setOpen(false); toast.success("Session created"); } });
  const activate = useMutation({ mutationFn: (id: string) => api.post(`/pickups/sessions/${id}/open/`),          onSuccess: () => { inv(); toast.success("Session opened — parents can now check in"); } });
  const start    = useMutation({ mutationFn: (id: string) => api.post(`/pickups/sessions/${id}/activate/`),      onSuccess: () => { inv(); toast.success("Dismissal started"); } });
  const close    = useMutation({ mutationFn: (id: string) => api.post(`/pickups/sessions/${id}/close/`),         onSuccess: () => { inv(); toast.success("Session closed"); } });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      scheduled: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
      open:      "bg-amber-500/20  text-amber-300  border border-amber-500/30",
      active:    "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
      closed:    "bg-white/10      text-white/40    border border-white/10",
      cancelled: "bg-rose-500/20   text-rose-300    border border-rose-500/30",
    };
    return map[s] ?? "bg-white/10 text-white/40";
  };

  const dotColor = (s: string) => {
    if (s === "active")    return "bg-emerald-400 animate-pulse";
    if (s === "open")      return "bg-amber-400";
    if (s === "closed")    return "bg-white/20";
    if (s === "cancelled") return "bg-rose-400";
    return "bg-slate-400";
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Sessions</h1>
          <p className="muted mt-1">Manage daily pickup sessions</p>
        </div>
        <button onClick={() => setOpen(!open)} className="btn-primary btn-md">
          <Plus size={15} /> New Session
        </button>
      </div>

      {/* Info banner — explains the workflow to staff */}
      <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/25 rounded-2xl px-4 py-3">
        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-blue-300 text-sm">
          <span className="font-semibold">Workflow:</span> Create a session →
          click <span className="font-semibold">Open</span> to let parents check in →
          click <span className="font-semibold">Start</span> when dismissal begins →
          click <span className="font-semibold">Close</span> when done.
          Parents can only see sessions that are <span className="font-semibold">Open</span> or <span className="font-semibold">Active</span>.
        </p>
      </div>

      {/* Create form */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/30 bg-[#0d1f17] p-5 shadow-lg"
        >
          <h3 className="text-white font-semibold text-lg mb-4">Create Session</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: "Type",
                key: "session_type",
                type: "select",
                opts: [
                  ["eyfs_am",    "EYFS Morning"],
                  ["eyfs_pm",    "EYFS Afternoon"],
                  ["primary_pm", "Primary Afternoon"],
                  ["extra",      "Extra / Ad-hoc"],
                ],
              },
              { label: "Date",  key: "date",             type: "date" },
              { label: "Start", key: "scheduled_start",  type: "time" },
              { label: "End",   key: "scheduled_end",    type: "time" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-emerald-300 text-xs font-semibold uppercase tracking-wide mb-1.5">
                  {f.label}
                </label>
                {f.type === "select" ? (
                  <select
                    className="w-full bg-[#071510] border border-emerald-500/30 rounded-xl px-4 py-2.5
                               text-white text-sm focus:outline-none focus:border-emerald-400
                               focus:ring-1 focus:ring-emerald-400/40"
                    value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  >
                    {(f.opts ?? []).map((opt) => (
                      <option key={opt[0]} value={opt[0]} className="bg-[#071510] text-white">
                        {opt[1]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    className="w-full bg-[#071510] border border-emerald-500/30 rounded-xl px-4 py-2.5
                               text-white text-sm focus:outline-none focus:border-emerald-400
                               focus:ring-1 focus:ring-emerald-400/40
                               [color-scheme:dark]"
                    value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500
                         text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              {create.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Calendar size={14} />
              )}
              Create Session
            </button>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10
                         text-white font-medium text-sm px-5 py-2.5 rounded-xl
                         border border-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Session list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={26} className="animate-spin text-emerald-400" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar size={34} className="text-white/20 mx-auto mb-3" />
          <p className="muted">No sessions yet — create one above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="card flex items-center gap-3 px-5 py-4 hover:border-white/20 transition-all"
            >
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor(s.status)}`} />
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/queue/${s.id}`)}
              >
                <p className="text-white font-medium text-sm">
                  {s.session_type.replace(/_/g, " ").toUpperCase()}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {s.date} · {s.scheduled_start}–{s.scheduled_end}
                  {s.status === "scheduled" && (
                    <span className="ml-2 text-amber-400">
                      — Click "Open" so parents can check in
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(s.status)}`}>
                  {s.status}
                </span>
                {s.status === "scheduled" && (
                  <button
                    onClick={() => activate.mutate(s.id)}
                    disabled={activate.isPending}
                    className="inline-flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30
                               text-amber-300 text-xs font-medium px-3 py-1.5 rounded-lg
                               border border-amber-500/30 transition-colors"
                  >
                    <Play size={11} /> Open
                  </button>
                )}
                {s.status === "open" && (
                  <button
                    onClick={() => start.mutate(s.id)}
                    disabled={start.isPending}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500
                               text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Play size={11} /> Start
                  </button>
                )}
                {s.status === "active" && (
                  <button
                    onClick={() => close.mutate(s.id)}
                    disabled={close.isPending}
                    className="inline-flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-500/30
                               text-rose-300 text-xs font-medium px-3 py-1.5 rounded-lg
                               border border-rose-500/30 transition-colors"
                  >
                    <Square size={11} /> Close
                  </button>
                )}
                <ArrowRight
                  size={13}
                  className="text-white/30 cursor-pointer hover:text-white/60 transition-colors"
                  onClick={() => navigate(`/queue/${s.id}`)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
