import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../stores/auth";
import {
  LayoutDashboard, CalendarDays, GraduationCap, Bot,
  Car, QrCode, LogOut, Bell, Shield, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import type { AppNotification } from "../types";

const NAV: Record<string, { to: string; icon: React.ElementType; label: string }[]> = {
  admin:     [{ to:"/dashboard",icon:LayoutDashboard,label:"Dashboard" },{to:"/sessions",icon:CalendarDays,label:"Sessions"},{to:"/students",icon:GraduationCap,label:"Students"},{to:"/ai",icon:Bot,label:"AI Assistant"}],
  teacher:   [{ to:"/dashboard",icon:LayoutDashboard,label:"Dashboard" },{to:"/students",icon:GraduationCap,label:"Students"},{to:"/ai",icon:Bot,label:"AI Assistant"}],
  gate_staff:[{ to:"/dashboard",icon:LayoutDashboard,label:"Dashboard" },{to:"/students",icon:GraduationCap,label:"Students"}],
  security:  [{ to:"/dashboard",icon:LayoutDashboard,label:"Dashboard" },{to:"/students",icon:Shield,label:"Safeguarding"}],
  parent:    [{ to:"/checkin",icon:Car,label:"Check In"},{to:"/status",icon:QrCode,label:"My Status"}],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [col, setCol] = useState(false);
  const items = NAV[user?.role ?? "parent"] ?? NAV.parent;

  const { data: notifs = [] } = useQuery<AppNotification[]>({
    queryKey: ["notifs"],
    queryFn: () => api.get("/alerts/").then(r => Array.isArray(r.data) ? r.data : (r.data.results ?? [])),
    refetchInterval: 30_000,
  });
  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div className="h-screen flex overflow-hidden bg-night bg-grid">
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.08) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.05) 0%, transparent 45%)" }} />

      {/* Sidebar */}
      <motion.aside
        animate={{ width: col ? 64 : 224 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        className="relative z-20 flex flex-col shrink-0 bg-night-100/90 backdrop-blur-2xl border-r border-white/8 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/8 min-h-[64px]">
          <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
            onClick={() => setCol(c => !c)}
            className="w-9 h-9 rounded-xl bg-jade/20 border border-jade/40 flex items-center justify-center cursor-pointer shrink-0 shadow-glow-jade">
            <GraduationCap size={18} className="text-jade" />
          </motion.div>
          <AnimatePresence>
            {!col && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="min-w-0 flex-1">
                <p className="font-display font-bold text-sm text-white leading-none">Doveland</p>
                <p className="text-slate text-xs mt-0.5">Traffic Control</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} title={col ? label : undefined}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                 transition-all duration-200 group border
                 ${isActive
                   ? "bg-jade/12 text-white border-jade/22"
                   : "text-slate hover:text-white hover:bg-white/5 border-transparent"}`
              }>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="nav-bg" className="absolute inset-0 rounded-xl bg-jade/8" />}
                  <Icon size={17} className={`relative z-10 shrink-0 transition-transform group-hover:scale-110 duration-200 ${isActive ? "text-jade" : ""}`} />
                  <AnimatePresence>
                    {!col && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 truncate">
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/8">
          <div className={`flex items-center gap-2.5 ${col ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-jade/20 border border-jade/40 flex items-center justify-center text-jade text-xs font-bold shrink-0">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <AnimatePresence>
              {!col && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{user?.full_name}</p>
                  <p className="text-slate text-xs capitalize truncate">{user?.role?.replace("_"," ")}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!col && (
              <button onClick={() => { logout(); navigate("/login"); }} className="btn-ghost p-1.5 rounded-lg shrink-0">
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCol(c => !c)}
          className="absolute top-1/2 -right-3 z-30 w-6 h-6 rounded-full bg-night-100 border border-white/15 flex items-center justify-center text-slate hover:text-white transition-colors">
          {col ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>
      </motion.aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-night/80 backdrop-blur-xl border-b border-white/8 px-6 py-3 flex items-center justify-end gap-2 shrink-0 z-10">
          <button className="relative btn-ghost p-2 rounded-xl">
            <Bell size={17} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-rose rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}