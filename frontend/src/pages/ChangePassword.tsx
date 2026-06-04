import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, ShieldCheck } from "lucide-react";
import api from "../api/client";
import toast from "react-hot-toast";

export default function ChangePassword() {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/accounts/change-password/", {
        current_password: form.current_password,
        new_password:     form.new_password,
      }),
    onSuccess: () => {
      setDone(true);
      setForm({ current_password: "", new_password: "", confirm_password: "" });
      toast.success("Password changed successfully!");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Failed to change password.";
      toast.error(msg);
    },
  });

  const canSubmit =
    form.current_password.length > 0 &&
    form.new_password.length >= 8 &&
    form.new_password === form.confirm_password &&
    !mutation.isPending;

  const passwordsMatch = form.confirm_password.length > 0 && form.new_password === form.confirm_password;
  const passwordsMismatch = form.confirm_password.length > 0 && form.new_password !== form.confirm_password;

  const handleSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate();
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-5">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full
                        flex items-center justify-center mx-auto">
          <CheckCircle size={36} className="text-emerald-400" />
        </div>
        <h2 className="text-white font-bold text-2xl">Password Updated!</h2>
        <p className="text-white/50 text-sm">Your password has been changed successfully. Use your new password next time you log in.</p>
        <button
          onClick={() => setDone(false)}
          className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white
                     font-medium text-sm px-5 py-2.5 rounded-xl border border-white/10 transition-colors"
        >
          Change Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">Change Password</h1>
        <p className="muted mt-1">Update your login password</p>
      </div>

      {/* Security tip */}
      <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/25 rounded-2xl px-4 py-3">
        <ShieldCheck size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-blue-300 text-sm">
          Choose a strong password of at least 8 characters. Avoid using your name, date of birth, or simple sequences like "12345678".
        </p>
      </div>

      {/* Form card */}
      <div className="bg-[#101827]/95 border border-white/10 rounded-2xl p-6 space-y-5 shadow-xl">

        {/* Current password */}
        <div>
          <label className="block text-white/60 text-xs font-semibold uppercase tracking-wide mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              type={show.current ? "text" : "password"}
              value={form.current_password}
              onChange={(e) => setForm((p) => ({ ...p, current_password: e.target.value }))}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-11 pr-12
                         text-white text-sm placeholder:text-white/25 focus:outline-none
                         focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
              placeholder="Enter your current password"
            />
            <button
              type="button"
              onClick={() => setShow((p) => ({ ...p, current: !p.current }))}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            >
              {show.current ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div>
          <label className="block text-white/60 text-xs font-semibold uppercase tracking-wide mb-1.5">
            New Password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              type={show.new ? "text" : "password"}
              value={form.new_password}
              onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-11 pr-12
                         text-white text-sm placeholder:text-white/25 focus:outline-none
                         focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShow((p) => ({ ...p, new: !p.new }))}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            >
              {show.new ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {/* Strength indicator */}
          {form.new_password.length > 0 && (
            <div className="mt-2 flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    form.new_password.length >= (i + 1) * 3
                      ? form.new_password.length >= 12
                        ? "bg-emerald-400"
                        : form.new_password.length >= 8
                        ? "bg-amber-400"
                        : "bg-rose-400"
                      : "bg-white/10"
                  }`}
                />
              ))}
              <span className="text-xs text-white/40 ml-1">
                {form.new_password.length < 8
                  ? "Too short"
                  : form.new_password.length < 12
                  ? "Good"
                  : "Strong"}
              </span>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-white/60 text-xs font-semibold uppercase tracking-wide mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              type={show.confirm ? "text" : "password"}
              value={form.confirm_password}
              onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
              className={`w-full h-12 bg-white/5 border rounded-xl pl-11 pr-12
                         text-white text-sm placeholder:text-white/25 focus:outline-none
                         focus:ring-1 transition-colors ${
                           passwordsMatch
                             ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/30"
                             : passwordsMismatch
                             ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/30"
                             : "border-white/10 focus:border-emerald-500 focus:ring-emerald-500/30"
                         }`}
              placeholder="Re-enter your new password"
            />
            <button
              type="button"
              onClick={() => setShow((p) => ({ ...p, confirm: !p.confirm }))}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            >
              {show.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {passwordsMismatch && (
            <p className="text-rose-400 text-xs mt-1.5">Passwords do not match</p>
          )}
          {passwordsMatch && (
            <p className="text-emerald-400 text-xs mt-1.5 flex items-center gap-1">
              <CheckCircle size={11} /> Passwords match
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
            canSubmit
              ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              : "bg-emerald-900/40 text-white/30 cursor-not-allowed"
          }`}
        >
          {mutation.isPending ? (
            <><Loader2 size={17} className="animate-spin" /> Updating...</>
          ) : (
            <><Lock size={16} /> Update Password</>
          )}
        </button>
      </div>
    </div>
  );
}
