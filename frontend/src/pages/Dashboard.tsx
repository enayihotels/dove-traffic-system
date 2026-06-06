import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Activity, Users, CheckCircle2, Clock, ArrowRight,
  Sparkles, Calendar, Loader2, Play, Square, Plus, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import api from "../api/client";
import { useAuth } from "../stores/auth";
import type { PickupSession } from "../types";
import toast from "react-hot-toast";

const S = {
  c: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  i: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

const Stat = ({ label, value, Icon, color }: {
  label: string; value: number; Icon: React.ElementType; color: string;
}) => (
  <motion.div variants={S.i} className="card p-5 hover:border-white/14 transition-colors">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
      <Icon size={19} />
    </div>
    <p className="font-display font-bold text-3xl text-white">{value}</p>
    <p className="muted mt-0.5">{label}</p>
  </motion.div>
);

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    open:      "bg-amber-500/20  text-amber-300  border-amber-500/30",
    active:    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    closed:    "bg-white/10      text-white/40   border-white/10",
  };
  const dot: Record<string, string> = {
    scheduled: "bg-slate-400",
    open:      "bg-amber-400 animate-pulse",
    active:    "bg-jade animate-pulse",
    closed:    "bg-white/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${map[status] ?? map.scheduled}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? dot.scheduled}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isStaff = user?.is_school_staff;

  const { data: sessions = [], isLoading } = useQuery<PickupSession[]>({
    queryKey: ["sessions"],
    queryFn: () =>
      api.get("/pickups/sessions/").then((r) =>
        Array.isArray(r.data) ? r.data : r.data.results ?? []
      ),
    refetchInterval: 45_000,
    retry: 1,
    retryDelay: 3000,
  });

  const inv = () => qc.invalidateQueries({ queryKey: ["sessions"] });

  const openSession     = useMutation({ mutationFn: (id: string) => api.post(`/pickups/sessions/${id}/open/`),     onSuccess: () => { inv(); toast.success("Session opened  -  parents can now check in!"); } });
  const activateSession = useMutation({ mutationFn: (id: string) => api.post(`/pickups/sessions/${id}/activate/`), onSuccess: () => { inv(); toast.success("Dismissal started!"); } });
  const closeSession    = useMutation({ mutationFn: (id: string) => api.post(`/pickups/sessions/${id}/close/`),    onSuccess: () => { inv(); toast.success("Session closed."); } });

  const active    = sessions.filter((s) => s.status === "active");
  const scheduled = sessions.filter((s) => s.status === "scheduled");
  const openSess  = sessions.filter((s) => s.status === "open");
  const inQueue   = sessions.reduce((a, s) => a + s.active_count, 0);
  const done      = sessions.reduce((a, s) => a + s.collected_count, 0);

  return (
    <motion.div variants={S.c} initial="hidden" animate="show" className="space-y-6 max-w-5xl">

      {/* Header */}
      <motion.div variants={S.i}>
        <div className="flex items-center gap-2">
          <h1 className="page-title">Dashboard</h1>
          {active.length > 0 && (
            <span className="badge badge-called flex items-center gap-1.5">
              <span className="live-dot" /> LIVE
            </span>
          )}
        </div>
        <p className="muted mt-1">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active Sessions"  value={active.length}    Icon={Activity}     color="bg-jade/20 text-jade" />
        <Stat label="In Queue Now"     value={inQueue}           Icon={Users}        color="bg-blue-500/20 text-blue-400" />
        <Stat label="Collected Today"  value={done}              Icon={CheckCircle2} color="bg-jade/20 text-jade-light" />
        <Stat label="Awaiting Open"    value={scheduled.length}  Icon={Clock}        color="bg-amber/20 text-amber" />
      </div>

      {/* ── ACTION REQUIRED BANNER ── */}
      {isStaff && (scheduled.length > 0 || openSess.length > 0) && (
        <motion.div variants={S.i} className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-2">
          <p className="text-amber-300 font-semibold text-sm flex items-center gap-2">
            <Clock size={15} /> Action Required  -  Sessions waiting for you
          </p>
          {scheduled.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-black/20 rounded-xl px-4 py-3 gap-3 flex-wrap">
              <div>
                <p className="text-white font-medium text-sm">{s.session_type.replace(/_/g, " ").toUpperCase()}</p>
                <p className="text-white/40 text-xs mt-0.5">{s.date}  .  {s.scheduled_start}-{s.scheduled_end}</p>
                <p className="text-amber-400 text-xs mt-1">! Not visible to parents yet  -  click Open to allow check-ins</p>
              </div>
              <button onClick={() => openSession.mutate(s.id)} disabled={openSession.isPending}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-4 py-2 rounded-xl transition-colors shrink-0">
                {openSession.isPending ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                Open Session
              </button>
            </div>
          ))}
          {openSess.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-black/20 rounded-xl px-4 py-3 gap-3 flex-wrap">
              <div>
                <p className="text-white font-medium text-sm">{s.session_type.replace(/_/g, " ").toUpperCase()}</p>
                <p className="text-white/40 text-xs mt-0.5">{s.date}  .  {s.scheduled_start}-{s.scheduled_end}</p>
                <p className="text-emerald-400 text-xs mt-1"> Parents can check in  -  click Start Dismissal when school gates open</p>
              </div>
              <button onClick={() => activateSession.mutate(s.id)} disabled={activateSession.isPending}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors shrink-0">
                {activateSession.isPending ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                Start Dismissal
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── ACTIVE SESSION LIVE CARDS ── */}
      {active.map((s) => (
        <motion.div key={s.id} variants={S.i}
          className="card-jade overflow-hidden relative cursor-pointer"
          onClick={() => navigate(`/queue/${s.id}`)}>
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(16,185,129,0.75),transparent)" }} />
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="text-jade font-medium text-sm">Dismissal In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="muted text-sm">{s.scheduled_start}-{s.scheduled_end}</span>
              {isStaff && (
                <button onClick={(e) => { e.stopPropagation(); closeSession.mutate(s.id); }}
                  disabled={closeSession.isPending}
                  className="inline-flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-rose-500/30 transition-colors">
                  {closeSession.isPending ? <Loader2 size={11} className="animate-spin" /> : <Square size={11} />}
                  Close Session
                </button>
              )}
              {/* ── VISIBLE ARROW BUTTON TO OPEN QUEUE ── */}
              <button onClick={(e) => { e.stopPropagation(); navigate(`/queue/${s.id}`); }}
                className="inline-flex items-center gap-1.5 bg-jade/20 hover:bg-jade/30 text-jade text-xs font-semibold px-3 py-1.5 rounded-lg border border-jade/30 transition-colors">
                Open Queue <ChevronRight size={13} />
              </button>
            </div>
          </div>
          <h2 className="font-display font-bold text-xl text-white mb-4">
            {s.session_type.replace(/_/g, " ").toUpperCase()} Session
          </h2>
          <div className="flex items-end gap-8 flex-wrap">
            {[
              { l: "In Queue",  v: s.active_count,    c: "text-jade"       },
              { l: "Collected", v: s.collected_count,  c: "text-jade-light" },
              { l: "Pending",   v: s.pending_count,    c: "text-amber"      },
            ].map((x) => (
              <div key={x.l}>
                <p className={`font-display font-bold text-4xl ${x.c}`}>{x.v}</p>
                <p className="muted text-xs mt-1">{x.l}</p>
              </div>
            ))}
            {s.ai_peak_time && (
              <div>
                <p className="font-display font-bold text-4xl text-amber flex items-center gap-2">
                  {s.ai_peak_time}
                  <Sparkles size={17} className="text-amber/70 animate-float" />
                </p>
                <p className="muted text-xs mt-1">AI Peak</p>
              </div>
            )}
          </div>
          {/* Bottom hint */}
          <p className="text-jade/50 text-xs mt-4 flex items-center gap-1">
            <ChevronRight size={11} /> Tap card or click "Open Queue" to call parents and mark collections
          </p>
        </motion.div>
      ))}

      {/* ── TODAY'S SESSIONS LIST ── */}
      <motion.div variants={S.i}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Today's Sessions</h2>
          {isStaff && (
            <button onClick={() => navigate("/sessions")}
              className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 transition-colors">
              <Plus size={12} /> New Session
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="card text-center py-12">
            <Loader2 size={24} className="animate-spin text-jade mx-auto" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar size={34} className="text-slate/25 mx-auto mb-3" />
            <p className="muted">No sessions yet</p>
            {isStaff && (
              <button onClick={() => navigate("/sessions")} className="btn-primary btn-md mt-4">
                Create First Session
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <motion.div key={s.id} whileHover={{ x: 2 }}
                className="card flex items-center gap-3 px-4 py-4 hover:border-white/20 transition-all">

                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  s.status === "active"    ? "bg-jade animate-pulse" :
                  s.status === "open"      ? "bg-amber-400 animate-pulse" :
                  s.status === "closed"    ? "bg-white/20" : "bg-rose-400"
                }`} />

                {/* Session info  -  clickable */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/queue/${s.id}`)}>
                  <p className="text-white font-medium text-sm">
                    {s.session_type.replace(/_/g, " ").toUpperCase()}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {s.scheduled_start}-{s.scheduled_end}
                  </p>
                </div>

                {/* Status badge  -  always visible */}
                <StatusBadge status={s.status} />

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {isStaff && s.status === "scheduled" && (
                    <button onClick={() => openSession.mutate(s.id)} disabled={openSession.isPending}
                      className="inline-flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-500/40 transition-colors">
                      {openSession.isPending ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                      Open
                    </button>
                  )}
                  {isStaff && s.status === "open" && (
                    <button onClick={() => activateSession.mutate(s.id)} disabled={activateSession.isPending}
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                      {activateSession.isPending ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                      Start Dismissal
                    </button>
                  )}
                  {isStaff && s.status === "active" && (
                    <button onClick={() => closeSession.mutate(s.id)} disabled={closeSession.isPending}
                      className="inline-flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-500/30 transition-colors">
                      {closeSession.isPending ? <Loader2 size={10} className="animate-spin" /> : <Square size={10} />}
                      Close
                    </button>
                  )}

                  {/* Always-visible Queue button for active/open sessions */}
                  {["active","open"].includes(s.status) && (
                    <button onClick={() => navigate(`/queue/${s.id}`)}
                      className="inline-flex items-center gap-1 bg-jade/15 hover:bg-jade/25 text-jade text-xs font-semibold px-3 py-1.5 rounded-lg border border-jade/25 transition-colors">
                      Queue <ChevronRight size={11} />
                    </button>
                  )}

                  {/* Arrow for all sessions */}
                  <button onClick={() => navigate(`/queue/${s.id}`)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
