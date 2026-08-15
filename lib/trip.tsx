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
import { api } from "./api";
import type { CurrentTripResponse, Reminder } from "./types";

/**
 * One trip at a time, one fetch for all the screens that hang off it
 * (`GET /driver-api/me/current-trip` — the start screen payload also carries
 * the journey plan and what is pending).
 *
 * Nothing is persisted: this lives in memory for the life of the tab, and a
 * fresh load always hits the network. Online-only means online-only.
 */
interface TripState {
  data: CurrentTripResponse | null;
  /**
   * Outstanding declarations across the driver's trips. A delivered trip drops
   * out of `/me/current-trip` entirely, so this is what keeps its return
   * declaration reachable.
   */
  reminders: Reminder[];
  loading: boolean;
  error: unknown;
  reload: () => Promise<void>;
}

const TripContext = createContext<TripState | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CurrentTripResponse | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Split in two so the first load never calls setState synchronously inside
  // the effect (React Compiler's cascading-render rule): `fetchTrip` only
  // touches state from the promise callbacks.
  const fetchTrip = useCallback(
    () =>
      Promise.all([
        api.get<CurrentTripResponse>("/driver-api/me/current-trip"),
        // Reminders are a nice-to-have next to the trip itself: if they fail,
        // the screen still works.
        api.get<Reminder[]>("/driver-api/me/reminders").catch(() => []),
      ])
        .then(([trip, pending]) => {
          setData(trip);
          setReminders(Array.isArray(pending) ? pending : []);
          setError(null);
        })
        .catch((err: unknown) => setError(err))
        .finally(() => setLoading(false)),
    [],
  );

  /** Manual refresh from an event handler — shows the spinner while it runs. */
  const reload = useCallback(async () => {
    setLoading(true);
    await fetchTrip();
  }, [fetchTrip]);

  useEffect(() => {
    void fetchTrip();
  }, [fetchTrip]);

  const value = useMemo<TripState>(
    () => ({ data, reminders, loading, error, reload }),
    [data, reminders, loading, error, reload],
  );

  return <TripContext value={value}>{children}</TripContext>;
}

export function useTrip(): TripState {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used inside <TripProvider>");
  return ctx;
}
