"use client";

import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/lib/trip";
import { daysUntil, formatDate, formatKm } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ActionTile, Card, Detail } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  EmptyState,
  ErrorScreen,
  LoadingScreen,
} from "@/components/ui/screen-state";
import { StatusPill } from "@/components/ui/status-pill";

/**
 * The home screen: one trip at a time (TRACKSURE.md §12). Route, stops,
 * destination, ETA, status — and, above all of it, whatever the driver is
 * being waited on for.
 */
export default function CurrentTripPage() {
  const { driver, logout } = useAuth();
  const { data, reminders, loading, error, reload } = useTrip();

  if (loading && !data) return <LoadingScreen />;
  if (error && !data)
    return (
      <ErrorScreen error={error} onRetry={() => void reload()} what="load your trip" />
    );

  const trip = data?.trip ?? null;
  const plan = data?.journeyPlan ?? null;
  const pending = data?.pending ?? null;

  const restStops = (plan?.legs ?? [])
    .filter((l) => l.kind === "PLANNED" && l.restStops)
    .map((l) => l.restStops)
    .join(" · ");

  // Declarations still owed on trips that are not the current one.
  const openReminders = reminders.filter(
    (r) => r.awaitingDriver && r.tripId !== trip?.id,
  );

  // Before departure the pre-trip waybill is the job; after it, the signed
  // post-trip photo is the delivery confirmation. Lead with the right one.
  const postPhase = trip
    ? trip.status === "IN_TRANSIT" || trip.status === "DELIVERED"
    : false;

  return (
    <div className="safe-bottom flex flex-1 flex-col">
      <header className="safe-top border-b border-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-lg items-center gap-3 px-4">
          <Image
            src="/brand/anfani-logo-horizontal-onlight.svg"
            alt="Anfani"
            width={1009}
            height={169}
            priority
            className="h-7 w-auto"
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="max-w-32 truncate text-base font-medium text-ink-soft">
              {driver?.name}
            </span>
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              className="flex size-12 shrink-0 items-center justify-center rounded-[0.625rem] text-ink-soft active:bg-surface"
            >
              <Icon name="log-out" className="size-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-5">
        {!trip ? (
          <>
            <EmptyState icon="truck" title="No trip right now">
              {data?.message ??
                "You will see your next trip here once Operations assigns it."}
            </EmptyState>

            {/* A delivered trip leaves the current-trip view but its return
                declaration is still owed. Reminder only — it never stops the
                next load, and the copy says so. */}
            {openReminders.map((r) => (
              <Alert
                key={r.journeyPlanId}
                tone="info"
                title={`${r.tripRef} is waiting on you`}
                action={
                  <ButtonLink
                    href={`/summary?trip=${r.tripId}`}
                    variant="primary"
                    icon="key-round"
                  >
                    Finish {r.tripRef}
                  </ButtonLink>
                }
              >
                {/* The API's own `blocks` line is written for Ops. Drivers get
                    the same fact in their words. */}
                Sign the return declaration. It will not stop your next load.
              </Alert>
            ))}
          </>
        ) : (
          <>
            {/* The one thing that shouts. Only the pre-departure declaration
                ever blocks; a pending return declaration is a reminder. */}
            {pending?.blockingNextStep && (
              <Alert
                tone="blocking"
                title="Loading cannot start yet"
                action={
                  <ButtonLink href="/journey-plan" variant="primary" icon="key-round">
                    Sign the declaration
                  </ButtonLink>
                }
              >
                {pending.message ??
                  "Confirm the pre-departure declaration with your PIN."}
              </Alert>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={trip.status} />
              <span className="font-display text-base font-semibold text-ink-soft">
                {trip.ref}
              </span>
            </div>

            <Card>
              <p className="text-base font-medium text-ink-soft">Going to</p>
              <p className="mt-1 font-display text-2xl font-semibold leading-tight text-ink">
                {trip.destination?.name ?? "Destination to be confirmed"}
              </p>
              {trip.destination?.state && (
                <p className="text-base text-ink-soft">
                  {trip.destination.state} State
                </p>
              )}

              <div className="mt-4 divide-y divide-line border-t border-line">
                <Detail
                  icon="map-pin"
                  label="Loading from"
                  value={trip.loadingPoint ?? "Ask the office"}
                />
                <Detail
                  icon="route"
                  label="Route"
                  value={trip.agreedRoute ?? "Not recorded yet"}
                />
                {restStops && (
                  <Detail icon="flag" label="Planned stops" value={restStops} />
                )}
                <Detail
                  icon="clock"
                  label="Expected delivery"
                  value={
                    trip.expectedEta ? (
                      <>
                        {formatDate(trip.expectedEta)}
                        <span className="ml-2 font-medium text-ink-soft">
                          {daysUntil(trip.expectedEta)}
                        </span>
                      </>
                    ) : (
                      "Not set yet"
                    )
                  }
                />
                <Detail
                  icon="truck"
                  label="Truck"
                  value={
                    trip.truck
                      ? `${trip.truck.truckNumber ?? trip.truck.ref}${
                          trip.truck.registration
                            ? ` · ${trip.truck.registration}`
                            : ""
                        }`
                      : "Not assigned"
                  }
                />
                <Detail
                  icon="building-2"
                  label="Customer"
                  value={trip.client?.name ?? "—"}
                />
                {typeof trip.kmToAndFro === "number" && (
                  <Detail
                    icon="route"
                    label="Distance to and fro"
                    value={formatKm(trip.kmToAndFro)}
                  />
                )}
              </div>

              {trip.destination?.specialInstructions && (
                <div className="mt-4">
                  <Alert tone="warning" title="At the delivery point">
                    {trip.destination.specialInstructions}
                  </Alert>
                </div>
              )}
            </Card>

            <nav className="space-y-3">
              <ActionTile
                href="/journey-plan"
                icon="clipboard-list"
                title="Journey plan"
                note="Route, hazards and instructions"
                tone={pending?.blockingNextStep ? "attention" : "normal"}
              />
              <ActionTile
                href={postPhase ? "/waybill/post" : "/waybill/pre"}
                icon="camera"
                title={
                  postPhase
                    ? "Photograph the signed waybill"
                    : "Photograph the pre-trip waybill"
                }
                note={
                  postPhase
                    ? "This is the delivery confirmation"
                    : "Take it at loading"
                }
              />
              <ActionTile
                href={postPhase ? "/waybill/pre" : "/waybill/post"}
                icon="image"
                title={
                  postPhase ? "Pre-trip waybill" : "Post-trip waybill"
                }
                note="See or add photos"
              />
              <ActionTile
                href="/complaint"
                icon="message-square-warning"
                title="Report a problem"
                note="Breakdown, delay, anything else"
              />
              <ActionTile
                href="/summary"
                icon="flag"
                title="End of trip"
                note="Trip summary and return declaration"
                tone={pending?.returnDeclaration ? "attention" : "normal"}
              />
            </nav>

            {/* Reminder, never a block — an unfinalised plan does not stop the
                next load (§6, changed at Anfani's request 13 Aug 2026). */}
            {pending?.returnDeclaration && !pending.blockingNextStep && (
              <Alert tone="info" title="Still to do">
                Sign the return declaration for this trip. It will not stop your
                next load.
              </Alert>
            )}
          </>
        )}
      </main>
    </div>
  );
}
