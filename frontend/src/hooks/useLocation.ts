import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/client";
import type { GPS } from "../types";

const THROTTLE = 15_000; // max 1 API call per 15 seconds

export function useLocation(watch = true) {
  const [loc, setLoc]       = useState<GPS | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const wid      = useRef<number | null>(null);
  const lastSent = useRef(0);

  const send = useCallback((g: GPS) => {
    const now = Date.now();
    if (now - lastSent.current < THROTTLE) return;
    lastSent.current = now;
    api.post("/location/update/", {
      latitude:  g.latitude,  longitude: g.longitude,
      accuracy:  g.accuracy ?? null,
      speed:     g.speed    ?? null,
      heading:   g.heading  ?? null,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported"); setLoading(false); return;
    }
    const opts: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 };
    const ok = (p: GeolocationPosition) => {
      const g: GPS = {
        latitude:  p.coords.latitude,  longitude: p.coords.longitude,
        accuracy:  p.coords.accuracy,  speed:     p.coords.speed,
        heading:   p.coords.heading,
      };
      setLoc(g); setError(null); setLoading(false); send(g);
    };
    const fail = (e: GeolocationPositionError) => {
      setError(["","Permission denied","Unavailable","Timed out"][e.code] ?? "Error");
      setLoading(false);
    };
    if (watch) {
      wid.current = navigator.geolocation.watchPosition(ok, fail, opts);
    } else {
      navigator.geolocation.getCurrentPosition(ok, fail, opts);
    }
    return () => { if (wid.current !== null) navigator.geolocation.clearWatch(wid.current); };
  }, [watch, send]);

  return { loc, error, loading };
}