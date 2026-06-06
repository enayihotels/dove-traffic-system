import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Car, Loader2, Zap, PartyPopper } from "lucide-react";
import { QRCode } from "react-qr-code";
import api from "../api/client";
import type { PickupRequest } from "../types";
import { useLocation } from "../hooks/useLocation";

const STEPS = [
  { key: "pending",   label: "Request Submitted"  },
  { key: "en_route",  label: "En Route to School" },
  { key: "arrived",   label: "Arrived at School"  },
  { key: "in_queue",  label: "In the Queue"       },
  { key: "called",    label: "Child Walking Out"  },
  { key: "collected", label: "Collected"          },
];

export default function MyStatus() {
  const { loc } = useLocation(true);

  const { data: requests = [], isLoading } = useQuery<PickupRequest[]>({
    queryKey: ["my-requests"],
    queryFn: () =>
      api.get("/pickups/requests/").then(r =>
        Array.isArray(r.data) ? r.data : (r.data.results ?? [])
      ),
    refetchInterval: 5_000,  // poll every 5s for quick status updates
    retry: 1,
    retryDelay: 3000,
  });

  const req     = requests.find(r => !["cancelled", "no_show"].includes(r.status));
  const step    = req ? STEPS.findIndex(s => s.key === req.status) : -1;
  const called    = req?.status === "called";
  const collected = req?.status === "collected";

  if (isLoading) return (
    <div className="flex justify-center py-24">
      <Loader2 size={26} className="animate-spin text-jade"/>
    </div>
  );

  // ── Collected screen ────────────────────────────────────────────────────────
  if (collected) return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto text-center py-16 space-y-6 px-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 220, delay: 0.1 }}
        className="w-24 h-24 bg-jade/12 border border-jade/32 rounded-full flex items-center justify-center mx-auto shadow-glow-jade">
        <PartyPopper size={40} className="text-jade"/>
      </motion.div>
      <h2 className="font-display font-bold text-3xl text-white">Pickup Complete!</h2>
      <p className="muted text-base">
        Your child has been safely collected. Have a great evening!
      </p>
      {req && (
        <div className="card border-jade/30 bg-jade/5 py-4">
          {req.children.map(c => (
            <div key={c.id} className="flex items-center justify-center gap-2">
              <CheckCircle size={16} className="text-jade"/>
              <span className="text-white font-medium">{c.student.full_name}</span>
              <span className="muted text-sm">{c.student.year_group_name}</span>
            </div>
          ))}
        </div>
      )}
      <p className="muted text-sm">
        This record has been saved to the school's safeguarding log.
      </p>
    </motion.div>
  );

  // ── No active request ───────────────────────────────────────────────────────
  if (!req) return (
    <div className="max-w-md mx-auto text-center py-20 space-y-4">
      <div className="w-16 h-16 bg-night-100/50 border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
        <Car size={26} className="text-slate/38"/>
      </div>
      <h2 className="font-display font-bold text-xl text-white">No Active Pickup</h2>
      <p className="muted text-sm">
        Head to Check In when a session is open and you are on the way.
      </p>
    </div>
  );

  // ── Active request ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-5">

      {/* Token card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`card text-center py-8 relative overflow-hidden ${
          called ? "border-orange-500/42 bg-orange-500/6" : "border-jade/28"
        }`}>
        <div className="absolute inset-x-0 top-0 h-px" style={{
          background: called
            ? "linear-gradient(90deg,transparent,rgba(249,115,22,0.8),transparent)"
            : "linear-gradient(90deg,transparent,rgba(16,185,129,0.7),transparent)"
        }}/>

        {called && (
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="flex items-center justify-center gap-2 mb-3">
            <Zap size={14} className="text-orange-400"/>
            <p className="text-orange-400 font-semibold text-sm uppercase tracking-widest">
              Your child is walking out
            </p>
            <Zap size={14} className="text-orange-400"/>
          </motion.div>
        )}

        <p className="muted text-sm mb-2">Queue Token</p>
        <p className={`font-mono font-bold text-5xl tracking-widest mb-1 ${
          called ? "text-orange-400" : "text-jade"
        }`}>
          {req.queue_token}
        </p>
        {req.queue_position != null && (
          <p className="muted text-xs">Position #{req.queue_position}</p>
        )}
      </motion.div>

      {/* Progress steps */}
      <div className="card">
        <p className="label mb-4">Pickup Progress</p>
        <div className="space-y-3">
          <AnimatePresence>
            {STEPS.map((s, i) => {
              const done = i < step;
              const curr = i === step;
              return (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    done ? "bg-jade/22 border border-jade/45" :
                    curr ? "bg-jade/18 border-2 border-jade" :
                    "bg-white/5 border border-white/10"
                  }`}>
                    {done
                      ? <CheckCircle size={12} className="text-jade"/>
                      : curr
                      ? <motion.div
                          className="w-2 h-2 bg-jade rounded-full"
                          animate={{ scale: [1, 1.4, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}/>
                      : <div className="w-2 h-2 bg-white/10 rounded-full"/>
                    }
                  </div>
                  <span className={`text-sm transition-colors flex-1 ${
                    done ? "text-jade" :
                    curr ? "text-white font-medium" :
                    "text-slate/38"
                  }`}>
                    {s.label}
                  </span>
                  {curr && (
                    <span className="text-jade text-xs font-medium px-2 py-0.5 bg-jade/10 rounded-full border border-jade/20">
                      Now
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Children */}
      <div className="card">
        <p className="label mb-3">Children Being Collected</p>
        <div className="space-y-2">
          {req.children.map(c => (
            <div key={c.id}
              className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-3 py-2.5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                style={{
                  backgroundColor: c.student.year_group_colour + "20",
                  border: `1px solid ${c.student.year_group_colour}40`,
                  color: c.student.year_group_colour,
                }}>
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

      {/* QR Code */}
      <div className="card text-center">
        <p className="label mb-4">Gate Verification QR Code</p>
        <div className="bg-white rounded-2xl p-4 inline-block">
          <QRCode value={req.id} size={152}/>
        </div>
        <p className="muted text-xs mt-3">Show this to gate staff for instant verification</p>
      </div>

      {loc && (
        <div className="card flex items-center gap-3">
          <span className="live-dot"/>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">Location sharing active</p>
            <p className="muted text-xs">School notified as you approach</p>
          </div>
        </div>
      )}
    </div>
  );
}
