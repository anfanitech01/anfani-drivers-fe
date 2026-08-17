"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatDateTime, formatKm, formatLiters, naira } from "@/lib/format";
import { useTrip } from "@/lib/trip";
import {
  tripFromDetail,
  type FuelReceipt,
  type JourneyPlan,
  type Trip,
  type TripDetail,
} from "@/lib/types";
import { PinDeclaration } from "@/components/pin-declaration";
import { Alert } from "@/components/ui/alert";
import { AppBar } from "@/components/ui/app-bar";
import { Card, CardTitle, Detail } from "@/components/ui/card";
import { EmptyState, LoadingScreen } from "@/components/ui/screen-state";

/**
 * End of trip (TRACKSURE.md §12): the completion summary — km from the KM
 * sheet, fuel logged against the estimate — and the return declaration.
 *
 * Reached two ways. Normally it is the current trip. But a delivered trip drops
 * out of `/me/current-trip` while its return declaration is still owed, so the
 * home screen links here with `?trip=<id>` and the trip is fetched directly.
 *
 * The return signature never blocks the next load. An unfinalised journey plan
 * is a reminder and nothing more (§6, changed at Anfani's request 13 Aug 2026),
 * so this screen nags and then gets out of the way.
 */
export default function SummaryPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Summary />
    </Suspense>
  );
}

function Summary() {
  const requestedTripId = useSearchParams().get("trip");
  const { data, loading: tripLoading, reload: reloadTrip } = useTrip();

  // `?trip=` wins; otherwise this is the trip in hand.
  const currentTrip = data?.trip ?? null;
  const [fetched, setFetched] = useState<Trip | null>(null);
  const [fetchingTrip, setFetchingTrip] = useState(Boolean(requestedTripId));

  const trip =
    requestedTripId && requestedTripId !== currentTrip?.id
      ? fetched
      : currentTrip;
  const tripId = trip?.id;

  const [plan, setPlan] = useState<JourneyPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [receipts, setReceipts] = useState<FuelReceipt[]>([]);

  const fetchTripById = useCallback(() => {
    if (!requestedTripId) return Promise.resolve();
    return api
      .get<TripDetail>(`/driver-api/trips/${requestedTripId}`)
      // The full record also carries billing and margin figures. Normalising
      // through `tripFromDetail` keeps them off this screen by construction —
      // drivers never see money (CLAUDE.md).
      .then((detail) => setFetched(tripFromDetail(detail)))
      .catch(() => setFetched(null))
      .finally(() => setFetchingTrip(false));
  }, [requestedTripId]);

  const fetchPlan = useCallback(() => {
    if (!tripId) return Promise.resolve();
    return api
      .get<JourneyPlan>(`/driver-api/trips/${tripId}/journey-plan`)
      .then(setPlan)
      // The summary is still worth showing without the plan; the declaration
      // block below simply does not appear.
      .catch(() => setPlan(null))
      .finally(() => setPlanLoading(false));
  }, [tripId]);

  /** Real receipts, so "fuel logged vs estimate" is a fact and not a promise. */
  const fetchReceipts = useCallback(() => {
    if (!tripId) return Promise.resolve();
    return api
      .get<FuelReceipt[]>(`/driver-api/trips/${tripId}/fuel-receipts`)
      .then((res) => setReceipts(Array.isArray(res) ? res : []))
      .catch(() => setReceipts([]));
  }, [tripId]);

  useEffect(() => {
    void fetchTripById();
  }, [fetchTripById]);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  useEffect(() => {
    void fetchReceipts();
  }, [fetchReceipts]);

  const refresh = useCallback(async () => {
    setPlanLoading(true);
    await Promise.all([
      fetchPlan(),
      fetchTripById(),
      fetchReceipts(),
      reloadTrip(),
    ]);
  }, [fetchPlan, fetchTripById, fetchReceipts, reloadTrip]);

  // First load only — a refresh after signing keeps the summary on screen.
  if ((tripLoading && !data) || fetchingTrip || (!!tripId && planLoading && !plan))
    return <LoadingScreen />;

  if (!trip) {
    return (
      <>
        <AppBar title="End of trip" />
        <EmptyState icon="flag" title="No trip right now">
          The summary appears on the trip you are running.
        </EmptyState>
      </>
    );
  }

  const delivered = trip.status === "DELIVERED";
  const returnOpen = delivered && plan && !plan.returnDriverAt;

  const litersLogged = receipts.reduce((sum, r) => sum + (r.liters ?? 0), 0);
  const amountLogged = receipts.reduce((sum, r) => sum + (r.amountKobo ?? 0), 0);
  const overEstimate =
    typeof trip.fuelEstimateLiters === "number" &&
    litersLogged > trip.fuelEstimateLiters;

  return (
    <>
      <AppBar title="End of trip" />

      <main className="safe-bottom mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-5">
        <div>
          <p className="font-display text-base font-semibold text-ink-soft">
            {trip.ref}
          </p>
          <p className="font-display text-2xl font-semibold leading-tight text-ink">
            {trip.destination?.name ?? "Your trip"}
          </p>
          {trip.deliveredAt && (
            <p className="mt-1 text-base text-ink-soft">
              Delivered {formatDateTime(trip.deliveredAt)}
            </p>
          )}
        </div>

        <Card>
          <CardTitle>Trip summary</CardTitle>
          <div className="mt-2 divide-y divide-line">
            <Detail
              icon="route"
              label="Distance to and fro"
              value={
                typeof trip.kmToAndFro === "number"
                  ? formatKm(trip.kmToAndFro)
                  : "Not recorded"
              }
            />
            <Detail
              icon="fuel"
              label="Fuel allowed for this trip"
              value={
                typeof trip.fuelEstimateLiters === "number"
                  ? formatLiters(trip.fuelEstimateLiters)
                  : "Not set"
              }
            />
            <Detail
              icon="fuel"
              label="Fuel you logged"
              value={
                receipts.length === 0 ? (
                  <span className="font-medium text-ink-soft">
                    No receipts logged
                  </span>
                ) : (
                  <>
                    {formatLiters(litersLogged)}
                    <span className="ml-2 font-medium text-ink-soft">
                      {receipts.length} receipt
                      {receipts.length === 1 ? "" : "s"}
                      {amountLogged > 0 ? ` · ${naira(amountLogged)}` : ""}
                    </span>
                  </>
                )
              }
            />
          </div>

          {/* Over the estimate is a fact for Ops to look at, not a problem for
              the driver to answer for: extra fuel is logged freely and there is
              no approval flow (§19). The wording stays neutral. */}
          {overEstimate && (
            <p className="mt-3 text-base leading-snug text-ink">
              That is {formatLiters(litersLogged - (trip.fuelEstimateLiters ?? 0))}{" "}
              more than this trip allowed for. The office sees this; there is
              nothing for you to do.
            </p>
          )}

          <p className="mt-3 text-base leading-snug text-ink-soft">
            The distance is the office&apos;s KM sheet figure, not a GPS
            reading.
          </p>
        </Card>

        {!delivered && (
          <Alert tone="info" title="Not finished yet">
            The return declaration opens once the office marks this trip
            delivered. Photograph the signed waybill at the delivery point
            first.
          </Alert>
        )}

        {returnOpen && plan && (
          <PinDeclaration
            journeyPlanId={plan.id}
            kind="return"
            onDeclared={refresh}
          />
        )}

        {delivered && plan?.returnDriverAt && (
          <Alert tone="success" title="You signed on return">
            {formatDateTime(plan.returnDriverAt)}
            {plan.returnCoordinatorAt
              ? " · the coordinator has signed too. This journey plan is finished."
              : " · waiting for the coordinator."}
          </Alert>
        )}
      </main>
    </>
  );
}
