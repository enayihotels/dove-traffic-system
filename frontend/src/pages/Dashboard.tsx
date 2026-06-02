import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Activity, Users, CheckCircle2, Clock, ArrowRight, Sparkles, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import api from "../api/client";
import type { PickupSession } from "../types";

const S = {
  c: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  i: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

const Stat = ({ label, value, Icon, color }: { label:string;value:number;Icon:React.ElementType;color:string }) => (
  <motion.div variants={S.i} className="card p-5 hover:border-white/14 transition-colors">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}><Icon size={19}/></div>
    <p className="font-display font-bold text-3xl text-white">{value}</p>
    <p className="muted mt-0.5">{label}</p>
  </motion.div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: sessions = [], isLoading } = useQuery<PickupSession[]>({
    queryKey: ["sessions"],
    queryFn: () => api.get("/pickups/sessions/").then(r => Array.isArray(r.data) ? r.data : (r.data.results ?? [])),
    refetchInterval: 20_000,
  });

  const active  = sessions.filter(s => s.status === "active");
  const inQueue = sessions.reduce((a, s) => a + s.active_count, 0);
  const done    = sessions.reduce((a, s) => a + s.collected_count, 0);
  const open    = sessions.filter(s => s.status === "open").length;

  return (
    <motion.div variants={S.c} initial="hidden" animate="show" className="space-y-6 max-w-5xl">
      <motion.div variants={S.i}>
        <div className="flex items-center gap-2">
          <h1 className="page-title">Dashboard</h1>
          {active.length > 0 && <span className="badge badge-called flex items-center gap-1.5"><span className="live-dot" />LIVE</span>}
        </div>
        <p className="muted mt-1">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active Sessions" value={active.length}  Icon={Activity}     color="bg-jade/20 text-jade" />
        <Stat label="In Queue Now"    value={inQueue}         Icon={Users}        color="bg-blue-500/20 text-blue-400" />
        <Stat label="Collected Today" value={done}            Icon={CheckCircle2} color="bg-jade/20 text-jade-light" />
        <Stat label="Awaiting Start"  value={open}            Icon={Clock}        color="bg-amber/20 text-amber" />
      </div>

      {active.map(s => (
        <motion.div key={s.id} variants={S.i} whileHover={{ scale: 1.004 }}
          onClick={() => navigate(`/queue/${s.id}`)}
          className="card-jade cursor-pointer overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(16,185,129,0.75),transparent)" }} />
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2"><span className="live-dot" /><span className="text-jade font-medium text-sm">Dismissal In Progress</span></div>
            <span className="muted text-sm flex items-center gap-1">{s.scheduled_start}â€“{s.scheduled_end}<ArrowRight size={13}/></span>
          </div>
          <h2 className="font-display font-bold text-xl text-white mb-4">{s.session_type.replace(/_/g," ").toUpperCase()} Session</h2>
          <div className="flex items-end gap-8 flex-wrap">
            {[{l:"In Queue",v:s.active_count,c:"text-jade"},{l:"Collected",v:s.collected_count,c:"text-jade-light"},{l:"Pending",v:s.pending_count,c:"text-amber"}].map(x=>(
              <div key={x.l}><p className={`font-display font-bold text-4xl ${x.c}`}>{x.v}</p><p className="muted text-xs mt-1">{x.l}</p></div>
            ))}
            {s.ai_peak_time && (
              <div><p className="font-display font-bold text-4xl text-amber flex items-center gap-2">{s.ai_peak_time}<Sparkles size={17} className="text-amber/70 animate-float"/></p><p className="muted text-xs mt-1">AI Peak</p></div>
            )}
          </div>
        </motion.div>
      ))}

      <motion.div variants={S.i}>
        <h2 className="section-title mb-3">Today's Sessions</h2>
        {isLoading ? (
          <div className="card text-center py-12"><Loader2 size={24} className="animate-spin text-jade mx-auto"/></div>
        ) : sessions.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar size={34} className="text-slate/25 mx-auto mb-3"/>
            <p className="muted">No sessions yet</p>
            <button onClick={() => navigate("/sessions")} className="btn-primary btn-md mt-4">Create Session</button>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <motion.div key={s.id} whileHover={{ x: 3 }} onClick={() => navigate(`/queue/${s.id}`)}
                className="card-hover flex items-center gap-3 px-5 py-4">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.status==="active"?"bg-jade animate-pulse":s.status==="open"?"bg-amber":s.status==="closed"?"bg-white/20":"bg-rose"}`}/>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{s.session_type.replace(/_/g," ").toUpperCase()}</p>
                  <p className="muted text-xs">{s.scheduled_start}â€“{s.scheduled_end}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-jade text-lg">{s.active_count}</span>
                  <span className={`badge ${s.status==="active"?"badge-called":s.status==="open"?"badge-pending":s.status==="closed"?"badge-collected":"badge-cancelled"}`}>{s.status}</span>
                  <ArrowRight size={13} className="text-slate/40"/>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}