import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, CheckCircle, AlertTriangle, Loader2, User, X, ShieldCheck } from "lucide-react";
import api from "../api/client";

interface VerifyResult {
  id:             string;
  queue_token:    string;
  status:         string;
  collector_name: string;
  collector_phone: string;
  session_type:   string;
  session_date:   string;
  ai_flagged:     boolean;
  ai_risk_level:  string;
  children: {
    name:       string;
    year_group: string;
    class_name: string;
    colour:     string;
    is_ready:   boolean;
  }[];
}

const STATUS_LABEL: Record<string, string> = {
  pending:   "Pending",
  en_route:  "En Route",
  arrived:   "Arrived",
  in_queue:  "In Queue",
  called:    "Called — Walking Out",
  collected: "Collected",
};

const STATUS_OK = ["pending","en_route","arrived","in_queue","called"];

export default function QRVerify() {
  const { id: urlId }       = useParams<{ id?: string }>();
  const [input, setInput]   = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error,  setError]  = useState("");
  const [busy,   setBusy]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-verify if UUID comes from scanned QR URL
  useEffect(() => {
    if (urlId) verify(urlId);
  }, [urlId]);

  const verify = async (id: string) => {
    const clean = id.trim();
    if (!clean) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.get(`/pickups/requests/${clean}/verify/`);
      setResult(data);
    } catch (e: any) {
      if (e.response?.status === 404) {
        setError("Invalid QR code — no matching pickup request found.");
      } else if (e.response?.status === 403) {
        setError("Access denied — please make sure you are logged in as staff.");
      } else if (!e.response) {
        setError("Server is starting up — please wait 30 seconds and try again.");
      } else {
        const detail = e.response?.data?.error || e.response?.data?.detail || "";
        setError(`Verification failed. ${detail || "Please try again."}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verify(input);
  };

  const reset = () => {
    setResult(null);
    setError("");
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const isAuthorised = result && STATUS_OK.includes(result.status) && !result.ai_flagged;
  const isFlagged    = result?.ai_flagged;
  const isCollected  = result?.status === "collected";

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <QrCode size={22} className="text-jade"/> QR Verification
        </h1>
        <p className="muted mt-1">
          Scan or paste a parent's QR code to verify their pickup authorisation.
        </p>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          className="input flex-1"
          placeholder="Scan QR or paste pickup ID here..."
          autoFocus
          disabled={busy}
        />
        <button type="submit" disabled={!input.trim() || busy}
          className="btn-primary btn-md px-5">
          {busy ? <Loader2 size={16} className="animate-spin"/> : "Verify"}
        </button>
      </form>

      {/* How to use */}
      {!result && !error && (
        <div className="card border-white/8 space-y-3 text-sm">
          <p className="text-white font-medium flex items-center gap-2">
            <ShieldCheck size={15} className="text-jade"/> How to verify a parent
          </p>
          <div className="space-y-2 text-slate/80">
            <p>
              <span className="text-white font-medium">Option A — Phone camera scan:</span> Ask
              parent to show QR code on their phone. Use your device camera app to
              scan it. The resulting URL or ID will auto-fill above.
            </p>
            <p>
              <span className="text-white font-medium">Option B — Manual ID:</span> Copy the
              pickup request ID from the Queue page and paste it above.
            </p>
            <p>
              <span className="text-white font-medium">Option C — Simulation:</span> Open the
              parent's My Status page, copy the URL of their QR code image or the
              request ID shown, and paste it here.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card border-rose/30 bg-rose/5 flex items-center gap-3">
            <AlertTriangle size={18} className="text-rose shrink-0"/>
            <p className="text-rose text-sm flex-1">{error}</p>
            <button onClick={reset} className="btn-ghost p-1"><X size={14}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className={`card relative overflow-hidden space-y-4 ${
              isFlagged    ? "border-rose/40 bg-rose/5" :
              isCollected  ? "border-white/10 opacity-60" :
              isAuthorised ? "border-jade/40 bg-jade/5"  :
              "border-amber/30"
            }`}>

            {/* Top colour bar */}
            <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl" style={{
              background: isFlagged ? "#ef4444" : isAuthorised ? "#10b981" : "#f59e0b"
            }}/>

            {/* Status banner */}
            <div className={`flex items-center gap-3 pt-2 ${
              isFlagged ? "text-rose" : isAuthorised ? "text-jade" : "text-amber"
            }`}>
              {isFlagged
                ? <AlertTriangle size={22} className="shrink-0"/>
                : isCollected
                ? <CheckCircle size={22} className="text-white/40 shrink-0"/>
                : isAuthorised
                ? <CheckCircle size={22} className="shrink-0"/>
                : <AlertTriangle size={22} className="shrink-0"/>
              }
              <div>
                <p className="font-bold text-lg">
                  {isFlagged    ? "FLAGGED — Do Not Release" :
                   isCollected  ? "Already Collected" :
                   isAuthorised ? "Authorised for Collection" :
                   "Check Status"}
                </p>
                <p className="text-sm opacity-70">
                  {STATUS_LABEL[result.status] ?? result.status}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-mono font-bold text-2xl text-white">{result.queue_token}</p>
                <p className="text-xs opacity-60">Queue token</p>
              </div>
            </div>

            {/* Collector info */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-jade/20 border border-jade/30 flex items-center justify-center shrink-0">
                <User size={16} className="text-jade"/>
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">{result.collector_name}</p>
                {result.collector_phone && (
                  <p className="text-slate text-sm">{result.collector_phone}</p>
                )}
              </div>
            </div>

            {/* Children */}
            <div>
              <p className="label mb-2">Children being collected</p>
              <div className="space-y-2">
                {result.children.map((c, i) => (
                  <div key={i}
                    className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-3 py-2.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{
                        backgroundColor: c.colour + "20",
                        border: `1px solid ${c.colour}40`,
                        color: c.colour,
                      }}>
                      {c.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{c.name}</p>
                      <p className="muted text-xs">{c.year_group} . {c.class_name}</p>
                    </div>
                    {c.is_ready && <CheckCircle size={14} className="text-jade shrink-0"/>}
                  </div>
                ))}
              </div>
            </div>

            {/* AI flag warning */}
            {isFlagged && (
              <div className="rounded-xl border border-rose/40 bg-rose/10 px-4 py-3">
                <p className="text-rose font-semibold text-sm flex items-center gap-2">
                  <AlertTriangle size={14}/> Safeguarding Flag
                </p>
                <p className="text-rose/80 text-sm mt-1">
                  Risk level: <strong>{result.ai_risk_level}</strong>. Do not release children.
                  Contact the class teacher immediately.
                </p>
              </div>
            )}

            <button onClick={reset}
              className="btn-secondary btn-md w-full">
              Scan Another
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
