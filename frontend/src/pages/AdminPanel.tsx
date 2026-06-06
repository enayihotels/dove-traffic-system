import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, UserPlus, Link, Loader2, CheckCircle,
  Trash2, Eye, EyeOff, ChevronDown, Search, ShieldCheck,
} from "lucide-react";
import api from "../api/client";
import toast from "react-hot-toast";

// ── Types ────────────────────────────────────────────────
interface ParentUser {
  id: string; email: string; first_name: string;
  last_name: string; full_name: string; phone: string; is_active: boolean;
}
interface Student {
  id: string; full_name: string; class_name: string;
  year_group_name: string; year_group_colour: string; pupil_reference: string;
}
interface Collector {
  id: string; user: string; student: string;
  collector_name: string; student_name: string;
  relationship: string; can_collect_alone: boolean; id_verified: boolean;
}

const RELATIONSHIPS = [
  ["mother", "Mother"], ["father", "Father"], ["guardian", "Legal Guardian"],
  ["grandparent", "Grandparent"], ["sibling_18", "Sibling (18+)"],
  ["childminder", "Childminder"], ["family_friend", "Family Friend"], ["other", "Other"],
];

// ── Reusable input style ─────────────────────────────────
const inp = `w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4
             text-white text-sm placeholder:text-white/25 focus:outline-none
             focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors`;
const lbl = `block text-white/50 text-xs font-semibold uppercase tracking-wide mb-1.5`;

// ── Tab button ───────────────────────────────────────────
const Tab = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      active
        ? "bg-emerald-600 text-white"
        : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/10"
    }`}
  >
    <Icon size={15} /> {label}
  </button>
);

export default function AdminPanel() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"parents" | "link">("parents");
  const [search, setSearch] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Create parent form
  const [pForm, setPForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", temp_password: "",
  });

  // Link child form
  const [lForm, setLForm] = useState({
    user: "", student: "", relationship: "mother",
    can_collect_alone: true, id_verified: false,
  });

  // ── Queries ──────────────────────────────────────────────
  const { data: parents = [], isLoading: pLoad } = useQuery<ParentUser[]>({
    queryKey: ["admin-parents"],
    queryFn: () => api.get("/accounts/users/?role=parent").then(r =>
      Array.isArray(r.data) ? r.data : r.data.results ?? []
    ),
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["admin-students"],
    queryFn: () => api.get("/students/").then(r =>
      Array.isArray(r.data) ? r.data : r.data.results ?? []
    ),
  });

  const { data: collectors = [], isLoading: cLoad } = useQuery<Collector[]>({
    queryKey: ["admin-collectors"],
    queryFn: () => api.get("/students/collectors/").then(r =>
      Array.isArray(r.data) ? r.data : r.data.results ?? []
    ),
  });

  // ── Mutations ────────────────────────────────────────────
  const createParent = useMutation({
    mutationFn: () => api.post("/accounts/create-parent/", pForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-parents"] });
      setPForm({ first_name: "", last_name: "", email: "", phone: "", temp_password: "" });
      toast.success("Parent account created! Share the login details with them.");
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Failed to create parent."),
  });

  const linkChild = useMutation({
    mutationFn: () => api.post("/students/collectors/", lForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collectors"] });
      setLForm({ user: "", student: "", relationship: "mother", can_collect_alone: true, id_verified: false });
      toast.success("Child linked to parent successfully!");
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Failed to link child. They may already be linked."),
  });

  const removeLink = useMutation({
    mutationFn: (id: string) => api.delete(`/students/collectors/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collectors"] });
      toast.success("Link removed.");
    },
  });

  // ── Filtered lists ───────────────────────────────────────
  const filteredParents = parents.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const canCreateParent =
    pForm.first_name && pForm.last_name && pForm.email &&
    pForm.temp_password.length >= 8 && !createParent.isPending;

  const canLink = lForm.user && lForm.student && !linkChild.isPending;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="page-title">Admin Panel</h1>
        <p className="muted mt-1">Create parent accounts and link children for pickup</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Parent Accounts", value: parents.length,    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Students",        value: students.length,   color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Active Links",    value: collectors.length, color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
            <p className={`font-bold text-3xl ${s.color}`}>{s.value}</p>
            <p className="text-white/50 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Tab active={tab === "parents"} onClick={() => setTab("parents")} icon={UserPlus} label="Create Parent Account" />
        <Tab active={tab === "link"}    onClick={() => setTab("link")}    icon={Link}     label="Link Child to Parent" />
      </div>

      {/* ── TAB 1: Create Parent ── */}
      {tab === "parents" && (
        <div className="space-y-5">
          {/* Create form */}
          <div className="bg-[#101827]/95 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <UserPlus size={16} className="text-emerald-400" /> New Parent Account
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>First Name</label>
                <input className={inp} placeholder="e.g. Comfort" value={pForm.first_name}
                  onChange={e => setPForm(p => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Last Name</label>
                <input className={inp} placeholder="e.g. Uko" value={pForm.last_name}
                  onChange={e => setPForm(p => ({ ...p, last_name: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Email Address</label>
                <input className={inp} type="email" placeholder="parent@email.com" value={pForm.email}
                  onChange={e => setPForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Phone Number</label>
                <input className={inp} placeholder="e.g. 08012345678" value={pForm.phone}
                  onChange={e => setPForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Temporary Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    className={inp + " pr-12"}
                    placeholder="Min. 8 characters  -  parent will change this on first login"
                    value={pForm.temp_password}
                    onChange={e => setPForm(p => ({ ...p, temp_password: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pForm.temp_password.length > 0 && pForm.temp_password.length < 8 && (
                  <p className="text-rose-400 text-xs mt-1.5">Password must be at least 8 characters</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
              <ShieldCheck size={15} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-blue-300 text-xs">
                The parent will use this email and temporary password to log in.
                They can change their password from the <strong>Change Password</strong> menu after logging in.
                Share these details securely  -  do not send passwords by WhatsApp or SMS.
              </p>
            </div>

            <button
              onClick={() => createParent.mutate()}
              disabled={!canCreateParent}
              className={`w-full h-11 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                canCreateParent
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  : "bg-emerald-900/40 text-white/30 cursor-not-allowed"
              }`}
            >
              {createParent.isPending
                ? <><Loader2 size={16} className="animate-spin" /> Creating...</>
                : <><UserPlus size={16} /> Create Parent Account</>
              }
            </button>
          </div>

          {/* Parent list */}
          <div className="bg-[#101827]/95 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-white font-semibold text-base flex items-center gap-2">
                <Users size={16} className="text-emerald-400" /> All Parent Accounts
              </h2>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  className="h-9 bg-white/5 border border-white/10 rounded-xl pl-8 pr-4
                             text-white text-sm placeholder:text-white/25 focus:outline-none
                             focus:border-emerald-500 w-52"
                  placeholder="Search parents..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {pLoad ? (
              <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-emerald-400" /></div>
            ) : filteredParents.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">No parent accounts yet</p>
            ) : (
              <div className="space-y-2">
                {filteredParents.map(p => {
                  const childLinks = collectors.filter(c => c.user === p.id);
                  return (
                    <div key={p.id} className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25
                                          flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
                            {p.first_name[0]}{p.last_name[0]}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{p.full_name}</p>
                            <p className="text-white/40 text-xs">{p.email} {p.phone ? ` .  ${p.phone}` : ""}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          p.is_active
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                            : "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                        }`}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {childLinks.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 pl-12">
                          {childLinks.map(cl => (
                            <span key={cl.id}
                              className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20
                                         text-blue-300 text-xs px-2.5 py-1 rounded-full">
                              {cl.student_name}
                              <span className="text-blue-400/60"> .  {cl.relationship}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {childLinks.length === 0 && (
                        <p className="text-amber-400/70 text-xs mt-1.5 pl-12">
                          ! No children linked yet  -  go to "Link Child to Parent" tab
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: Link Child ── */}
      {tab === "link" && (
        <div className="space-y-5">
          {/* Link form */}
          <div className="bg-[#101827]/95 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <Link size={16} className="text-emerald-400" /> Link a Child to a Parent
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Parent select */}
              <div>
                <label className={lbl}>Select Parent</label>
                <div className="relative">
                  <select
                    className={inp + " appearance-none pr-10"}
                    value={lForm.user}
                    onChange={e => setLForm(p => ({ ...p, user: e.target.value }))}
                  >
                    <option value="" className="bg-[#101827]"> -  Choose parent  - </option>
                    {parents.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#101827]">
                        {p.full_name} ({p.email})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>
              </div>

              {/* Student select */}
              <div>
                <label className={lbl}>Select Child</label>
                <div className="relative">
                  <select
                    className={inp + " appearance-none pr-10"}
                    value={lForm.student}
                    onChange={e => setLForm(p => ({ ...p, student: e.target.value }))}
                  >
                    <option value="" className="bg-[#101827]"> -  Choose student  - </option>
                    {students.map(s => (
                      <option key={s.id} value={s.id} className="bg-[#101827]">
                        {s.full_name}  -  {s.class_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>
              </div>

              {/* Relationship */}
              <div>
                <label className={lbl}>Relationship</label>
                <div className="relative">
                  <select
                    className={inp + " appearance-none pr-10"}
                    value={lForm.relationship}
                    onChange={e => setLForm(p => ({ ...p, relationship: e.target.value }))}
                  >
                    {RELATIONSHIPS.map(([v, l]) => (
                      <option key={v} value={v} className="bg-[#101827]">{l}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>
              </div>

              {/* Flags */}
              <div className="space-y-3 pt-1">
                {[
                  { key: "can_collect_alone", label: "Can collect alone" },
                  { key: "id_verified",       label: "ID verified by staff" },
                ].map(f => (
                  <label key={f.key} className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => setLForm(p => ({ ...p, [f.key]: !(p as any)[f.key] }))}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        (lForm as any)[f.key]
                          ? "bg-emerald-600 border-emerald-500"
                          : "bg-white/5 border-white/20 group-hover:border-emerald-500/50"
                      }`}
                    >
                      {(lForm as any)[f.key] && <CheckCircle size={12} className="text-white" />}
                    </div>
                    <span className="text-white/70 text-sm">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => linkChild.mutate()}
              disabled={!canLink}
              className={`w-full h-11 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                canLink
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  : "bg-emerald-900/40 text-white/30 cursor-not-allowed"
              }`}
            >
              {linkChild.isPending
                ? <><Loader2 size={16} className="animate-spin" /> Linking...</>
                : <><Link size={16} /> Link Child to Parent</>
              }
            </button>
          </div>

          {/* All links table */}
          <div className="bg-[#101827]/95 border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold text-base">All Parent-Child Links</h2>

            {cLoad ? (
              <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-emerald-400" /></div>
            ) : collectors.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">No links yet  -  create one above</p>
            ) : (
              <div className="space-y-2">
                {collectors.map(c => (
                  <div key={c.id}
                    className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">
                        {c.collector_name}
                        <span className="text-white/30 mx-2">{String.fromCharCode(8594)}</span>
                        {c.student_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-white/40 text-xs capitalize">{c.relationship}</span>
                        {c.can_collect_alone && (
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            Can collect alone
                          </span>
                        )}
                        {c.id_verified && (
                          <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ShieldCheck size={10} /> ID Verified
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${c.collector_name} from collecting ${c.student_name}?`)) {
                          removeLink.mutate(c.id);
                        }
                      }}
                      className="text-rose-400/50 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
