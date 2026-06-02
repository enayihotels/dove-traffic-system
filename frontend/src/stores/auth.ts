import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types/index";

interface AuthState {
  user: User | null;
  authed: boolean;
  setAuth(u: User, access: string, refresh: string): void;
  logout(): void;
  patch(p: Partial<User>): void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      authed: false,

      setAuth(user, access, refresh) {
        localStorage.setItem("access", access);
        localStorage.setItem("refresh", refresh);
        set({ user, authed: true });
      },

      logout() {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        set({ user: null, authed: false });
      },

      patch(p) {
        set((s) => ({ user: s.user ? { ...s.user, ...p } : null }));
      },
    }),
    {
      name: "doveland-auth",
      partialize: (s) => ({ user: s.user, authed: s.authed }),
    }
  )
);
