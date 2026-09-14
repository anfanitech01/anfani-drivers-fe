"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatLiters, naira } from "@/lib/format";
import { useTrip } from "@/lib/trip";
import { fuelPaymentCopy, type FuelReceipt } from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { AppBar } from "@/components/ui/app-bar";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { EmptyState, LoadingScreen } from "@/components/ui/screen-state";

/**
 * Fuel logged on this trip — **read only** (changed 14 Sep 2026).
 *
 * Drivers used to record their own fuel stops here: photograph the receipt,
 * pick the station, send. Anfani asked for that to move to Operations. The
 * station's credit-or-cash type is what the whole fuel ledger turns on
 * (invariant §15.5), and the person standing at the pump with a truck waiting
 * is the worst-placed person to be deciding it.
 *
 * The screen stays, because a driver who disputes what was logged in their name
 * needs something to point at. It shows what Ops recorded against this trip and
 * nothing else — no capture, no station picker, no amounts to type.
 *
 * The payment type IS shown, because whether the driver is out of pocket is
 * genuinely their business.
 */
export default function FuelPage() {
  const { data, loading } = useTrip();
  const trip = data?.trip ?? null;
  const tripId = trip?.id;

  const [logged, setLogged] = useState<FuelReceipt[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // State moves only inside the promise callbacks, never synchronously in the
  // effect body — the pattern `lib/trip.tsx` sets for this repo.
  const load = useCallback(
    (cancelled: () => boolean) => {
      if (!tripId) return Promise.resolve();
      return api
        .get<FuelReceipt[]>(`/driver-api/trips/${tripId}/fuel-receipts`)
        .then((rows) => {
          if (cancelled()) return;
          setLogged(rows);
          setFailure(null);
        })
        .catch((err: unknown) => {
          // Online-only app: a failed read says so and offers a retry. It
          // never shows a stale list as if it were current (CLAUDE.md).
          if (cancelled()) return;
          setFailure(
            errorMessage(
              err,
              "No network. Fuel could not be loaded. Tap to retry.",
            ),
          );
        });
    },
    [tripId],
  );

  useEffect(() => {
    let dead = false;
    void load(() => dead);
    return () => {
      dead = true;
    };
  }, [load, reloadKey]);

  const rows = logged ?? [];
  const totalLiters = rows.reduce(
    (sum, r) => sum + (typeof r.liters === "number" ? r.liters : 0),
    0,
  );

  if (loading) return <LoadingScreen />;

  if (!trip) {
    return (
      <>
        <AppBar title="Fuel" back="/" />
        <main className="px-4 pb-24 pt-4">
          <EmptyState icon="fuel" title="No trip running">
            Fuel shows here once you are on a trip.
          </EmptyState>
        </main>
      </>
    );
  }

  return (
    <>
      <AppBar title="Fuel" back="/" />
      <main className="space-y-4 px-4 pb-24 pt-4">
        <Alert tone="info" title="Operations record fuel now">
          Show your receipt to the office and they will add it. What they have
          added for this trip is below.
        </Alert>

        {failure && (
          <Alert
            tone="danger"
            title="Could not load"
            action={
              <Button
                onClick={() => setReloadKey((k) => k + 1)}
                icon="refresh-cw"
              >
                Tap to retry
              </Button>
            }
          >
            {failure}
          </Alert>
        )}

        {!failure && logged === null && (
          <p className="text-base text-ink-soft">Loading fuel…</p>
        )}

        {!failure && logged !== null && rows.length === 0 && (
          <EmptyState icon="fuel" title="Nothing logged yet">
            {typeof trip.fuelEstimateLiters === "number"
              ? `This trip is costed at ${formatLiters(trip.fuelEstimateLiters)}.`
              : "Operations will add your receipts."}
          </EmptyState>
        )}

        {rows.length > 0 && (
          <Card>
            <CardTitle>Fuel logged on this trip</CardTitle>
            <p className="mt-1 text-base text-ink-soft">
              {formatLiters(totalLiters)} so far
              {typeof trip.fuelEstimateLiters === "number"
                ? ` of ${formatLiters(trip.fuelEstimateLiters)} allowed`
                : ""}
              .
            </p>
            <ul className="mt-3 divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start gap-3 py-3">
                  <Icon
                    name="circle-check"
                    className="mt-0.5 size-6 shrink-0 text-success"
                  />
                  <div className="min-w-0">
                    <p className="text-[1.0625rem] font-semibold leading-snug text-ink">
                      {r.stationNameAtCapture ?? r.ref}
                    </p>
                    <p className="mt-0.5 text-base text-ink-soft">
                      {[
                        typeof r.liters === "number"
                          ? formatLiters(r.liters)
                          : null,
                        typeof r.amountKobo === "number"
                          ? naira(r.amountKobo)
                          : null,
                        r.capturedAt ? formatDateTime(r.capturedAt) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {r.resolvedType && (
                      <p className="mt-0.5 text-base text-ink-soft">
                        {fuelPaymentCopy[r.resolvedType].title} ·{" "}
                        {fuelPaymentCopy[r.resolvedType].body}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>
    </>
  );
}
