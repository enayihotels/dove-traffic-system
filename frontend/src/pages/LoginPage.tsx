// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";
// import { GraduationCap, Eye, EyeOff, Loader2, Mail, Lock, Wifi, Shield } from "lucide-react";
// import { useAuth } from "../stores/auth";
// import api from "../api/client";
// import toast from "react-hot-toast";

// export default function LoginPage() {
//   const [email, setEmail] = useState("");
//   const [pass, setPass]   = useState("");
//   const [show, setShow]   = useState(false);
//   const [busy, setBusy]   = useState(false);
//   const { setAuth }       = useAuth();
//   const navigate          = useNavigate();

//   const submit = async (e: React.FormEvent) =>
//      {
//     e.preventDefault();
//     setBusy(true);
//     try {
//       const { data: tok } = await api.post("/auth/login/", { email, password: pass });
//       const { data: user } = await api.get("/accounts/me/", {
//         headers: { Authorization: `Bearer ${tok.access}` },
//       });
//       setAuth(user, tok.access, tok.refresh);
//       toast.success(`Welcome back, ${user.first_name}!`);
//       navigate("/");
//     } catch {
//       toast.error("Incorrect email or password.");
//     } finally {
//       setBusy(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-night bg-grid flex items-center justify-center p-4"
//       style={{ background: "radial-gradient(ellipse at 25% 60%, rgba(16,185,129,0.12) 0%, transparent 55%), radial-gradient(ellipse at 78% 20%, rgba(245,158,11,0.07) 0%, transparent 45%), #070D18" }}>
//       {/* Floating particles */}
//       {[{x:"12%",y:"22%",d:0},{x:"84%",y:"60%",d:1.2},{x:"50%",y:"88%",d:2}].map((p,i) => (
//         <motion.div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-jade/40"
//           style={{ left: p.x, top: p.y }}
//           animate={{ y:[0,-14,0], opacity:[0.3,0.9,0.3] }}
//           transition={{ duration: 4+i, repeat: Infinity, delay: p.d }} />
//       ))}

//       <motion.div initial={{ opacity: 0, y: 28, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
//         transition={{ duration: 0.48, ease: "easeOut" }} className="w-full max-w-[420px] relative">
//         <div className="absolute inset-0 bg-jade/5 rounded-3xl blur-2xl scale-110" />

//         <div className="relative bg-night-100/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-card-lg overflow-hidden">
//           <div className="absolute inset-x-0 top-0 h-px"
//                style={{ background: "linear-gradient(90deg,transparent,rgba(16,185,129,0.7),transparent)" }} />

//           <div className="text-center mb-8">
//             <motion.div initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }}
//               transition={{ delay: 0.2, type: "spring", stiffness: 220, damping: 14 }}
//               className="w-16 h-16 bg-jade/12 border border-jade/35 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow-jade animate-float">
//               <GraduationCap size={32} className="text-jade" />
//             </motion.div>
//             <h1 className="font-display font-bold text-2xl text-white mb-1">Doveland School</h1>
//             <p className="text-slate text-sm">Traffic Control System</p>
//           </div>

//           <form onSubmit={submit} className="space-y-4">
//             <div>
//               <label className="label">Email Address</label>
//               <div className="relative">
//                 <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate" />
//                 <input type="email" value={email} onChange={e => setEmail(e.target.value)}
//                   className="input pl-10" placeholder="you@doveland.sch.uk" required autoFocus />
//               </div>
//             </div>
//             <div>
//               <label className="label">Password</label>
//               <div className="relative">
//                 <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate" />
//                 <input type={show ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)}
//                   className="input pl-10 pr-11" placeholder="Enter password" required />
//                 <button type="button" onClick={() => setShow(!show)}
//                   className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate hover:text-white transition-colors">
//                   {show ? <EyeOff size={14} /> : <Eye size={14} />}
//                 </button>
//               </div>
//             </div>
//             <motion.button type="submit" disabled={busy || !email || !pass}
//               whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
//               className="btn-primary btn-lg w-full mt-1">
//               {busy ? <><Loader2 size={17} className="animate-spin" /> Signing inâ€¦</> : "Sign In"}
//             </motion.button>
//           </form>

//           <div className="mt-6 pt-5 border-t border-white/8 flex items-center justify-center gap-6">
//             <div className="flex items-center gap-1.5 text-slate text-xs">
//               <Shield size={12} className="text-jade" /> Safeguarding compliant
//             </div>
//             <div className="flex items-center gap-1.5 text-slate text-xs">
//               <Wifi size={12} className="text-jade" /> Offline capable
//             </div>
//           </div>
//         </div>
//       </motion.div>
//     </div>
//   );
// }


import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, Loader2, Mail, Lock, Wifi, Shield } from "lucide-react";
import { useAuth } from "../stores/auth";
import api from "../api/client";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const canSubmit = email.trim() !== "" && pass.trim() !== "" && !busy;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canSubmit) {
      toast.error("Please enter your email and password.");
      return;
    }

    setBusy(true);

    try {
      const { data: tok } = await api.post("/auth/login/", {
        email: email.trim(),
        password: pass,
      });

      const { data: user } = await api.get("/accounts/me/", {
        headers: {
          Authorization: `Bearer ${tok.access}`,
        },
      });

      setAuth(user, tok.access, tok.refresh);

      toast.success(`Welcome back, ${user.first_name || "User"}!`);
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Incorrect email or password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(ellipse at 25% 60%, rgba(16,185,129,0.12) 0%, transparent 55%), radial-gradient(ellipse at 78% 20%, rgba(245,158,11,0.07) 0%, transparent 45%), #070D18",
      }}
    >
      <div className="w-full max-w-[420px]">
        <div className="bg-[#101827]/95 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap size={32} className="text-emerald-400" />
            </div>

            <h1 className="font-bold text-2xl text-white mb-1">
              Doveland School
            </h1>

            <p className="text-slate-400 text-sm">
              Traffic Control System
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 rounded-xl border border-white/10 bg-white text-slate-900 pl-11 pr-4 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="you@doveland.sch.uk"
                  autoComplete="email"
                  autoFocus
                  required
                  disabled={busy}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300"
              >
                Password
              </label>

              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />

                <input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="w-full h-12 rounded-xl border border-white/10 bg-white text-slate-900 pl-11 pr-12 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  disabled={busy}
                />

                <button
                  type="button"
                  onClick={() => setShow((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                  tabIndex={-1}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${
                canSubmit
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                  : "bg-emerald-900/60 text-slate-400 cursor-not-allowed"
              }`}
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-6">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Shield size={12} className="text-emerald-400" />
              Safeguarding compliant
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Wifi size={12} className="text-emerald-400" />
              Offline capable
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
            