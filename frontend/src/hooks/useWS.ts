import { useEffect, useRef, useCallback } from "react";

export function useWS(url: string, onMsg: (d: unknown) => void, enabled = true) {
  const ws    = useRef<WebSocket | null>(null);
  const timer = useRef<number | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem("access") ?? "";
    const sock  = new WebSocket(`${url}${url.includes("?") ? "&" : "?"}token=${token}`);
    ws.current  = sock;
    sock.onmessage = e => { try { onMsg(JSON.parse(e.data)); } catch {} };
    sock.onclose   = () => { timer.current = window.setTimeout(connect, 3_000); };
    sock.onerror   = () => sock.close();
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
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(d));
    }, []),
  };
}