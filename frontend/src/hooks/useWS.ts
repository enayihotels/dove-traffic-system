import { useEffect, useRef, useCallback } from "react";

// Refresh the access token silently using the stored refresh token
async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) return null;
  try {
    const res = await fetch(
      (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api")
        .replace(/\/api\/?$/, "") + "/api/auth/refresh/",
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ refresh }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access) {
      localStorage.setItem("access", data.access);
      return data.access;
    }
  } catch {}
  return null;
}

export function useWS(url: string, onMsg: (d: unknown) => void, enabled = true) {
  const ws      = useRef<WebSocket | null>(null);
  const timer   = useRef<number | null>(null);
  const retries = useRef(0);

  const connect = useCallback(async () => {
    // Always get the freshest token — refresh if needed
    let token = localStorage.getItem("access") ?? "";

    // If we've had repeated failures, try refreshing the token first
    if (retries.current > 1) {
      const fresh = await refreshAccessToken();
      if (fresh) { token = fresh; retries.current = 0; }
    }

    const sock = new WebSocket(
      `${url}${url.includes("?") ? "&" : "?"}token=${token}`
    );
    ws.current = sock;

    sock.onmessage = e => {
      try { onMsg(JSON.parse(e.data)); } catch {}
    };

    sock.onclose = (_e) => {
      retries.current += 1;
      // Back off: 3s, 6s, 10s, then every 15s
      const delay = retries.current <= 1 ? 3_000
                  : retries.current <= 3 ? 6_000
                  : retries.current <= 6 ? 10_000
                  : 15_000;
      timer.current = window.setTimeout(connect, delay);
    };

    sock.onopen = () => {
      retries.current = 0;  // reset on successful connection
    };

    sock.onerror = () => sock.close();
  }, [url, onMsg]);

  useEffect(() => {
    if (!enabled) return;
    connect();
    return () => {
      ws.current?.close();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [connect, enabled]);

  return {
    send: useCallback((d: unknown) => {
      if (ws.current?.readyState === WebSocket.OPEN)
        ws.current.send(JSON.stringify(d));
    }, []),
  };
}
