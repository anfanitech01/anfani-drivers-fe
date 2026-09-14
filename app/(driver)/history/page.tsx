"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatKm, naira } from "@/lib/format";
import type { HistoryPage, HistoryTrip } from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { AppBar } from "@/components/ui/app-bar";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState, LoadingScreen } from "@/components/ui/screen-state";

const PAGE_SIZE = 15;

/**
 * The driver's own record (§12, added 14 Sep 2026): every trip run, the
 * distance behind them, how they are doing, and any shortage recorded against
 * them.
 *
 * **This is the one screen here that is a list**, and it earns it: a driver
 * scrolling their own year is the whole point. Everything else in this app is
 * one trip and one action. The cards stay big and the type stays large — this
 * is still a phone in sunlight, not a dashboard.
 *
 * **No money except shortages.** What Anfani charges for a load, and what it
 * makes on it, never reaches the cab. A shortage does, because it is recorded
 * against the driver and the first they hear of one should not be a deduction
 * they cannot check.
 *
 * Online-only, like everything else: a failed page says so and offers a retry,
 * and never shows a stale list as current.
 */
export default function HistoryPage_() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<HistoryPage | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Split so the effect body never calls setState synchronously (React
  // Compiler's cascading-render rule) — the same shape `lib/trip.tsx` uses.
  // State moves only inside the promise callbacks.
  const load = useCallback(
    (cancelled: () => boolean) =>
      api
        .get<HistoryPage>("/driver-api/me/history", {
          page,
          pageSize: PAGE_SIZE,
        })
        .then((res) => {
          if (cancelled()) return;
          setResult(res);
          setFailure(null);
        })
        .catch((err: unknown) => {
          if (cancelled()) return;
          setFailure(
            errorMessage(err, "No network. Your trips could not be loaded."),
          );
        })
        .finally(() => {
          if (!cancelled()) setLoading(false);
        }),
    [page],
  );

  useEffect(() => {
    let dead = false;
    void load(() => dead);
    return () => {
      dead = true;
    };
  }, [load, reloadKey]);

  if (loading && !result) return <LoadingScreen />;

  const summary = result?.summary;
  const trips = result?.data ?? [];
  const meta = result?.meta;

  return (
    <>
      <AppBar title="My trips" back="/" />
      <main className="space-y-4 px-4 pb-24 pt-4">
        {failure && (
          <Alert
            tone="danger"
            title="Could not load"
            action={
              <Button
                onClick={() => {
                  setLoading(true);
                  setReloadKey((k) => k + 1);
                }}
                icon="refresh-cw"
              >
                Tap to retry
              </Button>
            }
          >
            {failure}
          </Alert>
        )}

        {summary && (
          <>
            {/* The three numbers a driver actually wants: how far, how many,
                and are they arriving on time. */}
            <div className="grid grid-cols-2 gap-3">
              <BigStat
                icon="route"
                value={formatKm(summary.kmTravelled)}
                label="Distance driven"
                note={`${summary.tripsDelivered} trip${summary.tripsDelivered === 1 ? "" : "s"} delivered`}
              />
              <BigStat
                icon="clock"
                value={
                  summary.onTime.rate === null ? "—" : `${summary.onTime.rate}%`
                }
                label="On time"
                note={
                  summary.onTime.rate === null
                    ? "Not enough dates yet"
                    : `${summary.onTime.onTime} of ${summary.onTime.delivered}`
                }
              />
            </div>

            {summary.shortages.approvedCount > 0 ||
            summary.shortages.pendingCount > 0 ? (
              <Card>
                <CardTitle>Shortages against you</CardTitle>
                <p className="mt-1 text-[1.0625rem] leading-snug text-ink">
                  {summary.shortages.approvedCount > 0
                    ? `${summary.shortages.approvedCount} approved, ${naira(summary.shortages.approvedKobo)}.`
                    : "None approved."}
                  {summary.shortages.pendingCount > 0
                    ? ` ${summary.shortages.pendingCount} still being decided.`
                    : ""}
                </p>
                <p className="mt-1 text-base text-ink-soft">
                  {summary.shortages.note}
                </p>
              </Card>
            ) : null}
          </>
        )}

        {!failure && trips.length === 0 && !loading && (
          <EmptyState icon="route" title="No trips yet">
            Your finished trips will show here.
          </EmptyState>
        )}

        <ul className="space-y-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <TripRow trip={trip} />
            </li>
          ))}
        </ul>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page <= 1 || loading}
              icon="arrow-left"
            >
              Newer
            </Button>
            <p className="text-base text-ink-soft">
              {meta.page} of {meta.totalPages}
            </p>
            <Button
              variant="secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={meta.page >= meta.totalPages || loading}
              icon="chevron-right"
            >
              Older
            </Button>
          </div>
        )}
      </main>
    </>
  );
}

/** One number, big enough to read at arm's length in sunlight. */
function BigStat({
  icon,
  value,
  label,
  note,
}: {
  icon: "route" | "clock";
  value: string;
  label: string;
  note: string;
}) {
  return (
    <div className="rounded-[0.625rem] border border-line bg-white p-4">
      <span className="flex size-10 items-center justify-center rounded-full bg-brand-tint text-brand-deep">
        <Icon name={icon} className="size-6" />
      </span>
      <p className="mt-3 font-display text-2xl font-semibold leading-none text-ink">
        {value}
      </p>
      <p className="mt-1 text-base font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-base leading-snug text-ink-soft">{note}</p>
    </div>
  );
}

function TripRow({ trip }: { trip: HistoryTrip }) {
  const approved = trip.shortages.filter((s) => s.status === "APPROVED");

  return (
    <Link
      href={`/summary?trip=${trip.id}`}
      className="block rounded-[0.625rem] border border-line bg-white p-4 active:bg-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold leading-snug text-ink">
            {trip.destination?.name ?? "Destination"}
          </p>
          <p className="mt-0.5 text-base text-ink-soft">
            {[
              trip.client?.name,
              trip.truck?.truckNumber,
              formatDate(trip.businessDate),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <StatusPill status={trip.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-2 text-base text-ink">
          <Icon name="route" className="size-5 shrink-0 text-ink-soft" />
          {formatKm(trip.kmToAndFro)}
        </span>
        <OnTimeLine trip={trip} />
      </div>

      {approved.length > 0 && (
        <p className="mt-2 flex items-center gap-2 text-base text-ink">
          <Icon name="triangle-alert" className="size-5 shrink-0 text-warning" />
          Shortage {naira(
            approved.reduce((sum, s) => sum + s.amountKobo, 0),
          )}
        </p>
      )}
    </Link>
  );
}

/**
 * On time, late, or nothing at all.
 *
 * Null is rendered as silence rather than a dash or a zero: the trip was not
 * rated because a date is missing, and putting a mark against a driver for a
 * gap in Anfani's own data would be unfair.
 */
function OnTimeLine({ trip }: { trip: HistoryTrip }) {
  if (trip.onTime === null) return null;
  return trip.onTime ? (
    <span className="flex items-center gap-2 text-base text-ink">
      <Icon name="circle-check" className="size-5 shrink-0 text-success" />
      On time
    </span>
  ) : (
    <span className="flex items-center gap-2 text-base text-ink">
      <Icon name="clock" className="size-5 shrink-0 text-warning" />
      Late
    </span>
  );
}
