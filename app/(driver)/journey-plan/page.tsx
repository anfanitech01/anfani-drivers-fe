"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useTrip } from "@/lib/trip";
import {
  hazardLabels,
  humanise,
  journeyPlanStatusLabels,
  type JourneyPlan,
} from "@/lib/types";
import { PinDeclaration } from "@/components/pin-declaration";
import { ViolationFeedback } from "@/components/violation-feedback";
import { Alert } from "@/components/ui/alert";
import { AppBar } from "@/components/ui/app-bar";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  EmptyState,
  ErrorScreen,
  LoadingScreen,
} from "@/components/ui/screen-state";

/**
 * The journey plan as the driver needs it: where they are going, what is
 * dangerous about the delivery point, what the office told them — and the
 * pre-departure declaration, which is the one thing on this app that genuinely
 * holds up the load (§6 gate).
 */
export default function JourneyPlanPage() {
  const { data, loading: tripLoading, reload: reloadTrip } = useTrip();
  const trip = data?.trip ?? null;
  const tripId = trip?.id;

  const [plan, setPlan] = useState<JourneyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // `fetchPlan` touches state only from the promise callbacks, so the initial
  // effect never triggers a cascading render; `load` adds the spinner for
  // retries.
  const fetchPlan = useCallback(() => {
    if (!tripId) return Promise.resolve();
    return api
      .get<JourneyPlan>(`/driver-api/trips/${tripId}/journey-plan`)
      .then((res) => {
        setPlan(res);
        setError(null);
      })
      .catch((err: unknown) => setError(err))
      .finally(() => setLoading(false));
  }, [tripId]);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchPlan();
  }, [fetchPlan]);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  const refresh = useCallback(async () => {
    await Promise.all([load(), reloadTrip()]);
  }, [load, reloadTrip]);

  // Skeleton on the first load only. Refreshing after a declaration keeps the
  // plan on screen — blanking the page the moment they sign reads as a failure.
  if ((tripLoading && !data) || (!!tripId && loading && !plan))
    return <LoadingScreen />;

  if (!trip) {
    return (
      <>
        <AppBar title="Journey plan" />
        <EmptyState icon="clipboard-list" title="No trip right now">
          A journey plan belongs to a trip. You will see one when Operations
          assigns your next load.
        </EmptyState>
      </>
    );
  }

  if (error && !plan) {
    return (
      <>
        <AppBar title="Journey plan" />
        <ErrorScreen
          error={error}
          onRetry={() => void load()}
          what="load your journey plan"
        />
      </>
    );
  }

  if (!plan) {
    return (
      <>
        <AppBar title="Journey plan" />
        <EmptyState icon="clipboard-list" title="No journey plan yet">
          The office is still preparing it.
        </EmptyState>
      </>
    );
  }

  const pending = data?.pending;
  const planned = (plan.legs ?? []).filter((l) => l.kind === "PLANNED");
  const hazards = (plan.hazards ?? []).filter((h) => h.checked);
  const violations = plan.violations ?? [];
  const needsPreTrip = !plan.preTripDriverAt;

  return (
    <>
      <AppBar title="Journey plan" />

      <main className="safe-bottom mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-5">
        <div>
          <p className="font-display text-base font-semibold text-ink-soft">
            {plan.ref}
          </p>
          <p className="text-base text-ink">
            {journeyPlanStatusLabels[plan.status] ?? plan.status}
          </p>
        </div>

        {pending?.blockingNextStep && needsPreTrip && (
          <Alert tone="blocking" title="Loading cannot start yet">
            {pending.message ??
              "You and the coordinator must both sign before the truck is loaded."}
          </Alert>
        )}

        {planned.length > 0 && (
          <Card>
            <CardTitle>Planned journey</CardTitle>
            <div className="mt-3 space-y-4">
              {planned.map((leg, i) => (
                <div key={i} className="border-t border-line pt-4 first:border-0 first:pt-0">
                  <p className="text-base font-medium text-ink-soft">
                    {leg.direction === "OUTBOUND" ? "Going" : "Coming back"}
                  </p>
                  <p className="mt-1 text-[1.0625rem] font-semibold leading-snug text-ink">
                    {leg.route ?? "Route not recorded"}
                  </p>
                  {leg.departureAt && (
                    <p className="mt-1 text-base text-ink-soft">
                      Leave {formatDateTime(leg.departureAt)}
                    </p>
                  )}
                  {leg.restStops && (
                    <p className="mt-1 text-base text-ink-soft">
                      Rest stops: {leg.restStops}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {hazards.length > 0 && (
          <Card>
            <CardTitle>Watch out at the delivery point</CardTitle>
            <ul className="mt-3 space-y-3">
              {hazards.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <Icon
                    name="triangle-alert"
                    className="mt-0.5 size-6 shrink-0 text-warning"
                  />
                  <div>
                    <p className="text-[1.0625rem] font-semibold leading-snug text-ink">
                      {hazardLabels[h.type] ?? humanise(h.type)}
                    </p>
                    {h.note && (
                      <p className="mt-0.5 text-base leading-snug text-ink-soft">
                        {h.note}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(plan.deliveryInstructions || plan.routeInstructions) && (
          <Card>
            <CardTitle>Instructions from the office</CardTitle>
            {plan.routeInstructions && (
              <p className="mt-3 text-base leading-snug text-ink">
                {plan.routeInstructions}
              </p>
            )}
            {plan.deliveryInstructions && (
              <p className="mt-3 text-base leading-snug text-ink">
                {plan.deliveryInstructions}
              </p>
            )}
          </Card>
        )}

        {needsPreTrip ? (
          <PinDeclaration
            journeyPlanId={plan.id}
            kind="pre-trip"
            onDeclared={refresh}
          />
        ) : (
          <Alert tone="success" title="You signed before departure">
            {formatDateTime(plan.preTripDriverAt!)}
            {plan.preTripCoordinatorAt
              ? " · the coordinator has signed too."
              : " · waiting for the coordinator."}
          </Alert>
        )}

        {violations.length > 0 && (
          <section className="space-y-3">
            <CardTitle>Recorded against this trip</CardTitle>
            <p className="text-base leading-snug text-ink-soft">
              Tell the office what happened. Your answer goes on the record with
              it.
            </p>
            {violations.map((v) => (
              <ViolationFeedback key={v.id} violation={v} onSaved={refresh} />
            ))}
          </section>
        )}
      </main>
    </>
  );
}
