import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, Loader2, Mail, Lock, Wifi, Shield } from "lucide-react";
import { useAuth } from "../stores/auth";
import api from "../api/client";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail]     = useState("");
  const [pass, setPass]       = useState("");
  const [show, setShow]       = useState(false);
  const [busy, setBusy]       = useState(false);
  const [waking, setWaking]   = useState(false);
  const [attempt, setAttempt] = useState(0);

  const { setAuth } = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const from     = (location.state as { from?: { pathname: string; search: string } })?.from;
  const returnTo = from ? `${from.pathname}${from.search || ""}` : "/";
  const canSubmit = email.trim() !== "" && pass.trim() !== "" && !busy;

  const tryLogin = () => api.post("/auth/login/", {
    email: email.trim(),
    password: pass,
  });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setWaking(false);
    setAttempt(0);

    let tokRes;

    // Retry up to 4 times with increasing wait — handles Render free tier
    // cold start which can take up to 30 seconds
    for (let i = 0; i < 4; i++) {
      try {
        tokRes = await tryLogin();
        break; // success — exit loop
      } catch (err: any) {
        if (err.response) {
          // Server responded with an error (wrong password etc) — don't retry
          setBusy(false);
          setWaking(false);
          if (err.response.status === 400 || err.response.status === 401) {
            toast.error("Incorrect email or password.");
          } else {
            toast.error("Something went wrong. Please try again.");
          }
          return;
        }
        // Network error = server sleeping
        if (i < 3) {
          setWaking(true);
          setAttempt(i + 1);
          const wait = [8000, 10000, 12000][i]; // 8s, 10s, 12s
          await new Promise(res => setTimeout(res, wait));
        } else {
          // All retries exhausted
          setBusy(false);
          setWaking(false);
          toast.error("Server is taking too long to respond. Please try again in 30 seconds.");
          return;
        }
      }
    }

    if (!tokRes) {
      setBusy(false);
      setWaking(false);
      return;
    }

    try {
      const { data: user } = await api.get("/accounts/me/", {
        headers: { Authorization: `Bearer ${tokRes.data.access}` },
      });
      setAuth(user, tokRes.data.access, tokRes.data.refresh);
      toast.success(`Welcome back, ${user.first_name || "User"}!`);
      navigate(returnTo, { replace: true });
    } catch {
      toast.error("Login succeeded but could not load your profile. Please try again.");
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                  tabIndex={-1}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Waking up indicator */}
            {waking && (
              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                <Loader2 size={16} className="animate-spin text-amber-400 shrink-0" />
                <div>
                  <p className="text-amber-300 text-sm font-medium">
                    Starting up server... (attempt {attempt}/3)
                  </p>
                  <p className="text-amber-400/70 text-xs">
                    Server was sleeping. Waking up — please wait up to 30 seconds.
                  </p>
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
