import axios from "axios";

// Normalise whatever Render has stored as VITE_API_URL:
//   "https://doveland-backend.onrender.com"      -> adds /api
//   "https://doveland-backend.onrender.com/api"  -> keeps as-is
//   "https://doveland-backend.onrender.com/api/" -> strips trailing slash
const raw  = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const BASE = raw.replace(/\/api\/?\s*$/, "") + "/api";

const api = axios.create({
  baseURL: BASE,
  timeout: 35_000,   // 35s — enough time for Render free tier to wake from sleep
});

// Decode JWT exp claim without a library
function jwtExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000; // convert to ms
  } catch { return 0; }
}

api.interceptors.request.use(async cfg => {
  let token = localStorage.getItem("access");

  // Proactively refresh if token expires within 5 minutes
  if (token) {
    const expiry = jwtExpiry(token);
    const inFiveMin = Date.now() + 5 * 60 * 1000;
    if (expiry > 0 && expiry < inFiveMin) {
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE}/auth/refresh/`, { refresh });
          token = data.access;
          localStorage.setItem("access", token as string);
        } catch { /* let the request proceed and 401 handler will catch it */ }
      }
    }
  }

  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(r => r, async err => {
  const orig = err.config;

  // Silent retry once on network errors (ERR_CONNECTION_CLOSED = backend waking up)
  if (!orig._retry && !err.response) {
    orig._retry = true;
    await new Promise(res => setTimeout(res, 3000)); // wait 3s then retry
    return api(orig);
  }

  // Token refresh on 401
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
