import axios from "axios";

// Normalise whatever Render has stored as VITE_API_URL:
//   "https://doveland-backend.onrender.com"      → adds /api
//   "https://doveland-backend.onrender.com/api"  → keeps as-is
//   "https://doveland-backend.onrender.com/api/" → strips trailing slash
const raw  = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const BASE = raw.replace(/\/api\/?\s*$/, "") + "/api";

const api = axios.create({ baseURL: BASE, timeout: 15_000 });

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem("access");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(r => r, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry) {
    orig._retry = true;
    const refresh = localStorage.getItem("refresh");
    if (refresh) {
      try {
        const { data } = await axios.post(`${BASE}/auth/refresh/`, { refresh });
        localStorage.setItem("access", data.access);
        orig.headers.Authorization = `Bearer ${data.access}`;
        return api(orig);
      } catch {
        localStorage.clear();
        window.location.replace("/login");
      }
    }
  }
  return Promise.reject(err);
});

export default api;
