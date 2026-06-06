import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, Loader2, Mail, Lock, Wifi, Shield } from "lucide-react";
import { useAuth } from "../stores/auth";
import api from "../api/client";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail]   = useState("");
  const [pass, setPass]     = useState("");
  const [show, setShow]     = useState(false);
  const [busy, setBusy]     = useState(false);
  const [waking, setWaking] = useState(false);

  const { setAuth } = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  // If redirected here from a protected page (e.g. QR scan link), go back there after login
  const from = (location.state as { from?: { pathname: string; search: string } })?.from;
  const returnTo = from ? `${from.pathname}${from.search || ""}` : "/";
  const canSubmit   = email.trim() !== "" && pass.trim() !== "" && !busy;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setWaking(false);

    // Helper: try login once, return data or throw
    const attempt = () => api.post("/auth/login/", {
      email: email.trim(),
      password: pass,
    });

    try {
      // First attempt
      let tokRes;
      try {
        tokRes = await attempt();
      } catch (firstErr: any) {
        // If it's a network error (backend sleeping), show waking message and retry
        if (!firstErr.response) {
          setWaking(true);
          await new Promise(res => setTimeout(res, 8000)); // wait 8s for backend to wake
          tokRes = await attempt(); // second attempt
          setWaking(false);
        } else {
          throw firstErr; // real error (wrong password etc) — don't retry
        }
      }

      const { data: user } = await api.get("/accounts/me/", {
        headers: { Authorization: `Bearer ${tokRes.data.access}` },
      });

      setAuth(user, tokRes.data.access, tokRes.data.refresh);
      toast.success(`Welcome back, ${user.first_name || "User"}!`);
      navigate(returnTo, { replace: true });

    } catch (err: any) {
      setWaking(false);
      if (err.response?.status === 400 || err.response?.status === 401) {
        toast.error("Incorrect email or password.");
      } else if (!err.response) {
        toast.error("Server is unavailable. Please try again in a moment.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
      setWaking(false);
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
            <h1 className="font-bold text-2xl text-white mb-1">Doveland School</h1>
            <p className="text-slate-400 text-sm">Traffic Control System</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="email" name="email" type="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full h-12 rounded-xl border border-white/10 bg-white text-slate-900 pl-11 pr-4 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="you@doveland.sch.uk"
                  autoComplete="email" autoFocus required disabled={busy}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="password" name="password"
                  type={show ? "text" : "password"}
                  value={pass} onChange={e => setPass(e.target.value)}
                  className="w-full h-12 rounded-xl border border-white/10 bg-white text-slate-900 pl-11 pr-12 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Enter password"
                  autoComplete="current-password" required disabled={busy}
                />
                <button type="button" onClick={() => setShow(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900" tabIndex={-1}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Waking up indicator */}
            {waking && (
              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                <Loader2 size={16} className="animate-spin text-amber-400 shrink-0" />
                <div>
                  <p className="text-amber-300 text-sm font-medium">Starting up server...</p>
                  <p className="text-amber-400/70 text-xs">This takes a few seconds on first login. Please wait.</p>
                </div>
              </div>
            )}

            <button
              type="submit" disabled={!canSubmit}
              className={`w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${
                canSubmit
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                  : "bg-emerald-900/60 text-slate-400 cursor-not-allowed"
              }`}
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {waking ? "Waking server..." : "Signing in..."}
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-6">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Shield size={12} className="text-emerald-400" /> Safeguarding compliant
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Wifi size={12} className="text-emerald-400" /> Offline capable
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
