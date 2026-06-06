import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, Car, Loader2 } from "lucide-react";
import { QRCode } from "react-qr-code";
import api from "../api/client";
import type { PickupRequest } from "../types";
import { useLocation } from "../hooks/useLocation";

const STEPS = [
  {key:"pending",  label:"Request Submitted"},
  {key:"en_route", label:"En Route to School"},
  {key:"arrived",  label:"Arrived at School"},
  {key:"in_queue", label:"In the Queue"},
  {key:"called",   label:"Child Walking Out"},
  {key:"collected",label:"Collected âœ“"},
];

export default function MyStatus() {
  const { loc } = useLocation(true);
  const { data:requests=[], isLoading } = useQuery<PickupRequest[]>({
    queryKey:["my-requests"],
    queryFn: () => api.get("/pickups/requests/").then(r=>Array.isArray(r.data)?r.data:(r.data.results??[])),
    refetchInterval: 30_000,
    retry: 1,
    retryDelay: 3000,
  });

  const req  = requests.find(r=>!["collected","cancelled","no_show"].includes(r.status));
  const step = req ? STEPS.findIndex(s=>s.key===req.status) : -1;
  const called = req?.status === "called";

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 size={26} className="animate-spin text-jade"/></div>;
  if (!req) return (
    <div className="max-w-md mx-auto text-center py-20 space-y-4">
      <div className="w-16 h-16 bg-night-100/50 border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
        <Car size={26} className="text-slate/38"/>
      </div>
      <h2 className="font-display font-bold text-xl text-white">No Active Pickup</h2>
      <p className="muted text-sm">Head to Check In when a session is open and you're on the way.</p>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}}
        className={`card text-center py-8 relative overflow-hidden ${called?"border-orange-500/42 bg-orange-500/6":"border-jade/28"}`}>
        <div className="absolute inset-x-0 top-0 h-px" style={{background:called?"linear-gradient(90deg,transparent,rgba(249,115,22,0.8),transparent)":"linear-gradient(90deg,transparent,rgba(16,185,129,0.7),transparent)"}}/>
        {called && <motion.p animate={{opacity:[1,0.4,1]}} transition={{duration:1.4,repeat:Infinity}} className="text-orange-400 font-semibold text-sm mb-3 uppercase tracking-widest">âš¡ Your child is walking out âš¡</motion.p>}
        <p className="muted text-sm mb-2">Queue Token</p>
        <p className={`font-mono font-bold text-5xl tracking-widest mb-1 ${called?"text-orange-400":"text-jade"}`}>{req.queue_token}</p>
        {req.queue_position!=null && <p className="muted text-xs">Position #{req.queue_position}</p>}
      </motion.div>

      <div className="card">
        <p className="label mb-4">Pickup Progress</p>
        <div className="space-y-3">
          {STEPS.map((s,i) => {
            const done=i<step, curr=i===step;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${done?"bg-jade/22 border border-jade/45":curr?"bg-jade/18 border-2 border-jade":"bg-white/5 border border-white/10"}`}>
                  {done?<CheckCircle size={12} className="text-jade"/>:curr?<motion.div className="w-2 h-2 bg-jade rounded-full" animate={{scale:[1,1.4,1]}} transition={{duration:1.5,repeat:Infinity}}/>:<div className="w-2 h-2 bg-white/10 rounded-full"/>}
                </div>
                <span className={`text-sm transition-colors ${done?"text-jade":curr?"text-white font-medium":"text-slate/38"}`}>{s.label}</span>
                {curr && <span className="ml-auto text-jade text-xs">â† Now</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <p className="label mb-3">Children Being Collected</p>
        <div className="space-y-2">
          {req.children.map(c=>(
            <div key={c.id} className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-3 py-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                   style={{backgroundColor:c.student.year_group_colour+"20",border:`1px solid ${c.student.year_group_colour}40`,color:c.student.year_group_colour}}>
                {c.student.first_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{c.student.full_name}</p>
                <p className="muted text-xs">{c.student.year_group_name}</p>
              </div>
              {c.is_ready && <CheckCircle size={15} className="text-jade shrink-0"/>}
            </div>
          ))}
        </div>
      </div>

      <div className="card text-center">
        <p className="label mb-4">Gate Verification QR Code</p>
        <div className="bg-white rounded-2xl p-4 inline-block"><QRCode value={req.id} size={152}/></div>
        <p className="muted text-xs mt-3">Show this to gate staff for instant verification</p>
      </div>

      {loc && (
        <div className="card flex items-center gap-3">
          <span className="live-dot"/><div className="flex-1"><p className="text-white text-sm font-medium">Location sharing active</p><p className="muted text-xs">School notified as you approach</p></div>
        </div>
      )}
    </div>
  );
}