"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const REFRESH_INTERVAL_MS = 50 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;

interface AuthUser {
  email: string;
  firstName: string;
  lastName: string;
  userId: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null; }
    if (refreshTimer.current) { clearInterval(refreshTimer.current); refreshTimer.current = null; }
  }, []);

  const performSignOut = useCallback(async () => {
    clearTimers();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    window.location.href = "/";
  }, [clearTimers]);

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const fetchSession = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const res = await fetch("/api/auth/session", {
        signal: AbortSignal.timeout(10_000),
      });
      const data = await res.json();
      if (data.user) return data.user;

      // Session expired — try refreshing tokens
      const refreshed = await refreshTokens();
      if (!refreshed) return null;

      // Retry session after refresh
      const retryRes = await fetch("/api/auth/session", {
        signal: AbortSignal.timeout(10_000),
      });
      const retryData = await retryRes.json();
      return retryData.user || null;
    } catch {
      return null;
    }
  }, [refreshTokens]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(performSignOut, IDLE_TIMEOUT_MS);
  }, [performSignOut]);

  // Load session on mount
  useEffect(() => {
    fetchSession().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, [fetchSession]);

  // Idle timer + activity listeners + token refresh when logged in
  useEffect(() => {
    if (!user) return;

    resetIdleTimer();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetIdleTimer));

    refreshTimer.current = setInterval(async () => {
      const u = await fetchSession();
      if (!u) { performSignOut(); return; }
      setUser(u);
    }, REFRESH_INTERVAL_MS);

    const handleVisibility = async () => {
      if (document.visibilityState !== "visible") return;
      const u = await fetchSession();
      if (!u) { performSignOut(); return; }
      setUser(u);
      resetIdleTimer();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimers();
    };
  }, [user, resetIdleTimer, performSignOut, clearTimers, fetchSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = "Login failed";
      try { msg = JSON.parse(text).error || msg; } catch {}
      throw new Error(msg);
    }
    // Clear stale DIY state from previous sessions
    const diyKeys = ["diy-output", "diy-error", "diy-refs", "diy-dataset", "diy-sources", "diy-references", "diy-target", "diy-allsnps", "diy-individual-selection", "diy-individual-samples", "diy-sample-totals", "diy-active-run"];
    diyKeys.forEach((k) => sessionStorage.removeItem(k));

    const data = await res.json();
    setUser(data.user);
  }, []);

  const signOut = useCallback(() => {
    performSignOut();
  }, [performSignOut]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
