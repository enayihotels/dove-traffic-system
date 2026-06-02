import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Car, CheckCircle, Navigation, AlertCircle, Loader2, ChevronRight, Clock } from "lucide-react";
import api from "../api/client";
import type { Student, PickupSession } from "../types";
import { useLocation } from "../hooks/useLocation";
import toast from "react-hot-toast";

export default function Checkin() {
  const [sel, setSel]   = useState<string[]>([]);
  const [done, setDone] = useState<{token:string}|null>(null);
  const qc              = useQueryClient();
  const { loc, error: geoErr, loading: geoLoad } = useLocation(true);

  const { data: students=[], isLoading:sLoad } = useQuery<Student[]>({
    queryKey:["my-students"],
    queryFn: () => api.get("/students/").then(r=>Array.isArray(r.data)?r.data:(r.data.results??[])),
  });
  const { data: sessions=[] } = useQuery<PickupSession[]>({
    queryKey:["open-sessions"],
    queryFn: () => api.get("/pickups/sessions/").then(r=>Array.isArray(r.data)?r.data:(r.data.results??[])),
    refetchInterval:30_000,
  });
  const active = sessions.find(s=>["open","active"].includes(s.status));

  const checkin = useMutation({
    mutationFn: () => api.post("/pickups/requests/", {
      session:    active?.id,
      student_ids:sel,
      checkin_lat:loc?.latitude  ?? null,
      checkin_lng:loc?.longitude ?? null,
    }),
    onSuccess: res => { setDone({ token:res.data.queue_token }); setSel([]); qc.invalidateQueries({queryKey:["my-requests"]}); },
    onError: () => toast.error("Check-in failed. Please try again."),
  });

  const toggle = (id:string) => setSel(p=>p.includes(id)?p.filter(s=>s!==id):[...p,id]);

  if (done) return (
    <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="max-w-md mx-auto text-center py-16 space-y-5">
      <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",stiffness:220,delay:0.1}}
        className="w-20 h-20 bg-jade/12 border border-jade/32 rounded-full flex items-center justify-center mx-auto shadow-glow-jade">
        <CheckCircle size={34} className="text-jade"/>
      </motion.div>
      <h2 className="font-display font-bold text-2xl text-white">You're Checked In!</h2>
      <p className="muted">Your queue token is</p>
      <div className="card border-jade/38 bg-jade/6 inline-block px-12 py-7 mx-auto">
        <p className="font-mono font-bold text-5xl text-jade tracking-widest">{done.token}</p>
      </div>
      <p className="muted text-sm">You'll be notified when your child is ready.</p>
      <button onClick={()=>setDone(null)} className="btn-secondary btn-md">Check In Another</button>
    </motion.div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div><h1 className="page-title">Check In for Pickup</h1><p className="muted mt-1">Select children and submit when on the way</p></div>

      <div className={`card flex items-center gap-3 ${loc?"border-jade/28 bg-jade/4":geoErr?"border-amber/28 bg-amber/4":""}`}>
        {geoLoad ? (
          <><Loader2 size={17} className="animate-spin text-slate shrink-0"/><span className="muted text-sm">Getting locationâ€¦</span></>
        ) : loc ? (
          <><Navigation size={17} className="text-jade shrink-0"/>
          <div className="flex-1"><p className="text-white text-sm font-medium">Location active</p><p className="muted text-xs">Automatic arrival detection enabled</p></div>
          <CheckCircle size={15} className="text-jade shrink-0"/></>
        ) : (
          <><AlertCircle size={17} className="text-amber shrink-0"/>
          <div><p className="text-white text-sm font-medium">Location unavailable</p><p className="muted text-xs">{geoErr ?? "Allow location for auto check-in"}</p></div></>
        )}
      </div>

      {active ? (
        <div className="card border-amber/22 bg-amber/4">
          <div className="flex items-center gap-2 mb-1"><span className="live-dot"/><p className="text-amber text-xs font-semibold uppercase tracking-wider">Active Session</p></div>
          <p className="font-display font-bold text-white">{active.session_type.replace(/_/g," ").toUpperCase()}</p>
          <p className="muted text-sm">{active.scheduled_start}â€“{active.scheduled_end}</p>
        </div>
      ) : (
        <div className="card text-center py-8"><Clock size={26} className="text-slate/28 mx-auto mb-2"/><p className="muted text-sm">No active sessions right now</p></div>
      )}

      <div>
        <p className="label">Select children to collect</p>
        {sLoad ? (
          <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-jade"/></div>
        ) : students.length===0 ? (
          <div className="card text-center py-8"><p className="muted text-sm">No children linked to your account</p></div>
        ) : (
          <div className="space-y-2 mt-2">
            {students.map(s => {
              const on = sel.includes(s.id);
              return (
                <motion.div key={s.id} whileTap={{scale:0.99}} onClick={()=>toggle(s.id)}
                  className={`card flex items-center gap-3 cursor-pointer select-none transition-all duration-200 ${on?"border-jade/45 bg-jade/7":"card-hover"}`}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                       style={{backgroundColor:s.year_group_colour+"20",border:`1px solid ${s.year_group_colour}40`,color:s.year_group_colour}}>
                    {s.first_name[0]}{s.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{s.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:s.year_group_colour}}/>
                      <p className="muted text-xs">{s.year_group_name} Â· {s.class_name}</p>
                    </div>
                  </div>
                  <AnimatePresence mode="wait">
                    {on ? <motion.div key="c" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}><CheckCircle size={19} className="text-jade shrink-0"/></motion.div>
                        : <ChevronRight size={15} className="text-slate/38 shrink-0"/>}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <motion.button onClick={()=>checkin.mutate()} disabled={sel.length===0||!active||checkin.isPending}
        whileHover={{scale:1.01}} whileTap={{scale:0.98}} className="btn-primary btn-lg w-full">
        {checkin.isPending ? <><Loader2 size={17} className="animate-spin"/> Checking inâ€¦</> : <><Car size={17}/> Check In ({sel.length} child{sel.length!==1?"ren":""})</>}
      </motion.button>
    </div>
  );
}