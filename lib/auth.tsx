"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  api,
  clearToken,
  getToken,
  onUnauthorized,
  request,
  setToken,
} from "./api";
import type { Actor, LoginResponse } from "./types";

interface AuthState {
  driver: Actor | null;
  /** True until the stored token has been checked against /auth/me. */
  loading: boolean;
  login: (phone: string, pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [driver, setDriver] = useState<Actor | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap the session from the stored token (POSTMAN_AUTH.md §4). The
  // token is the only thing we keep on the device — never trip data.
  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    const bootstrap = token
      ? api.get<Actor>("/auth/me")
      : Promise.resolve(null);
    bootstrap
      .then((me) => {
        if (!cancelled) setDriver(me);
      })
      .catch((err) => {
        // A dead network on cold start is not a dead session: keep the token,
        // let the screen show its retry state rather than dumping them out.
        if (err instanceof ApiError && err.isOffline) return;
        clearToken();
        if (!cancelled) setDriver(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A 401 anywhere means the session is gone: drop it and send them to login.
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setDriver(null);
      router.replace("/login");
    });
    return () => {
      unsubscribe();
    };
  }, [router]);

  const login = useCallback(async (phone: string, pin: string) => {
    const res = await request<LoginResponse>("/auth/driver/login", {
      method: "POST",
      body: { phone, pin },
      auth: false,
    });
    if (res.actor.population !== "DRIVER") {
      throw new ApiError(403, "This app is for Anfani drivers only.");
    }
    setToken(res.accessToken);
    setDriver(res.actor);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setDriver(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthState>(
    () => ({ driver, loading, login, logout }),
    [driver, loading, login, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
