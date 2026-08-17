"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, api, errorMessage, upload } from "@/lib/api";
import { formatDateTime, formatLiters, naira } from "@/lib/format";
import { requestFix, type FixState } from "@/lib/geo";
import type { PreparedPhoto } from "@/lib/photo";
import { useTrip } from "@/lib/trip";
import {
  fuelPaymentCopy,
  type FuelReceipt,
  type FuelReceiptCreated,
  type Station,
  type StationsResponse,
} from "@/lib/types";
import { PhotoCapture } from "@/components/photo-capture";
import { StationPicker } from "@/components/station-picker";
import { Alert } from "@/components/ui/alert";
import { AppBar } from "@/components/ui/app-bar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { EmptyState, LoadingScreen } from "@/components/ui/screen-state";

/**
 * Fuel stop (TRACKSURE.md §12): photograph the receipt, tag the station, done.
 * Credit or cash resolves from the station record server-side — the driver is
 * never asked and never offered the choice (invariant §15.5). It is shown back
 * to them once the receipt is in, because whether they are out of pocket is
 * genuinely their business.
 *
 * Extra fuel is logged freely: there is no approval flow and this screen must
 * never imply one (§19).
 *
 * Like every capture screen here, there is no queue. A failed upload stays on
 * screen and says so, in those words.
 */
export default function FuelStopPage() {
  const { data, loading, reload } = useTrip();
  const trip = data?.trip ?? null;
  const tripId = trip?.id;

  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [liters, setLiters] = useState("");
  const [amount, setAmount] = useState("");
  const [fix, setFix] = useState<FixState>({ status: "locating" });

  const [stations, setStations] = useState<Station[]>([]);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [logged, setLogged] = useState<FuelReceipt[]>([]);
  const [percent, setPercent] = useState(0);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState<FuelReceiptCreated | null>(null);

  const askForFix = useCallback(() => {
    requestFix()
      .then((f) => setFix({ status: "ready", fix: f }))
      .catch((err: Error) =>
        setFix({ status: "unavailable", reason: err.message }),
      );
  }, []);

  const locate = useCallback(() => {
    setFix({ status: "locating" });
    askForFix();
  }, [askForFix]);

  const fetchStations = useCallback(
    () =>
      api
        .get<StationsResponse>("/driver-api/stations")
        .then((res) => {
          setStations(res.stations ?? []);
          setStationsError(null);
        })
        .catch((err: unknown) =>
          setStationsError(
            errorMessage(err, "No network. The station list did not load."),
          ),
        ),
    [],
  );

  const fetchLogged = useCallback(() => {
    if (!tripId) return Promise.resolve();
    return api
      .get<FuelReceipt[]>(`/driver-api/trips/${tripId}/fuel-receipts`)
      .then((res) => setLogged(Array.isArray(res) ? res : []))
      .catch(() => setLogged([]));
  }, [tripId]);

  useEffect(() => {
    askForFix();
  }, [askForFix]);

  useEffect(() => {
    void fetchStations();
  }, [fetchStations]);

  useEffect(() => {
    void fetchLogged();
  }, [fetchLogged]);

  // The API takes whole litres only. A pump prints 180.7, so accept the dot as
  // typed and truncate for sending — stripping the dot outright would turn
  // "180.7" into "1807" and quietly report ten times the fuel.
  const litersRaw = liters.replace(/[^\d.]/g, "");
  const [litersWhole = "", litersFraction = ""] = litersRaw.split(".");
  const litersValue = litersWhole;
  const litersTruncated = litersFraction.length > 0;

  const amountNaira = Number(amount.replace(/[^\d.]/g, ""));
  const amountKobo =
    amount.trim() && Number.isFinite(amountNaira)
      ? Math.round(amountNaira * 100)
      : null;

  const ready = Boolean(photo && station && !sending);

  async function send() {
    if (!photo || !station || !trip || sending) return;
    setSending(true);
    setFailure(null);
    setPercent(0);

    const form = new FormData();
    form.append("photo", photo.file);
    form.append("stationId", station.id);
    form.append("capturedAt", capturedAt ?? new Date().toISOString());
    if (litersValue) form.append("liters", litersValue);
    if (amountKobo !== null) form.append("amountKobo", String(amountKobo));
    if (fix.status === "ready") {
      form.append("gpsLat", String(fix.fix.lat));
      form.append("gpsLng", String(fix.fix.lng));
    }

    try {
      const result = await upload<FuelReceiptCreated>(
        `/driver-api/trips/${trip.id}/fuel-receipts`,
        form,
        { onProgress: setPercent },
      );
      setSent(result);
      setPhoto(null);
      setStation(null);
      setLiters("");
      setAmount("");
      await Promise.all([fetchLogged(), reload()]);
    } catch (err) {
      setFailure(
        err instanceof ApiError && err.isOffline
          ? "No network. Your receipt was NOT sent. Tap to retry."
          : errorMessage(
              err,
              "No network. Your receipt was NOT sent. Tap to retry.",
            ),
      );
    } finally {
      setSending(false);
    }
  }

  if (loading && !data) return <LoadingScreen />;

  if (!trip) {
    return (
      <>
        <AppBar title="Fuel stop" />
        <EmptyState icon="fuel" title="No trip right now">
          Fuel receipts attach to the trip you are running. You will see this
          again on your next load.
        </EmptyState>
      </>
    );
  }

  const totalLiters = logged.reduce((sum, r) => sum + (r.liters ?? 0), 0);

  return (
    <>
      <AppBar title="Fuel stop" />

      <main className="safe-bottom mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-5">
        {sent ? (
          <>
            <Alert tone="success" title="Receipt sent">
              Saved against {trip.ref}
              {sent.ref ? ` as ${sent.ref}` : ""}.
            </Alert>

            {/* The one moment credit/cash is surfaced. It was resolved from the
                station record, not chosen here. */}
            {sent.resolvedType && fuelPaymentCopy[sent.resolvedType] && (
              <Card>
                <div className="flex gap-3">
                  <Icon
                    name="receipt"
                    className="mt-0.5 size-6 shrink-0 text-brand-deep"
                  />
                  <div>
                    <p className="text-base font-medium text-ink-soft">
                      {sent.stationNameAtCapture ?? "Station"}
                    </p>
                    <p className="mt-0.5 font-display text-lg font-semibold leading-tight text-ink">
                      {fuelPaymentCopy[sent.resolvedType].title}
                    </p>
                    <p className="mt-1 text-base leading-snug text-ink">
                      {fuelPaymentCopy[sent.resolvedType].body}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-3">
              <Button
                variant="secondary"
                icon="camera"
                onClick={() => {
                  setSent(null);
                  setPercent(0);
                  locate();
                }}
              >
                Log another fuel stop
              </Button>
              <ButtonLink href="/" variant="primary" icon="truck">
                Back to my trip
              </ButtonLink>
            </div>
          </>
        ) : (
          <>
            <p className="text-base leading-snug text-ink">
              Photograph the receipt and tell us where you fuelled. You do not
              need to say how it was paid for — the office knows.
            </p>

            <PhotoCapture
              photo={photo}
              onChange={(p) => {
                setPhoto(p);
                setCapturedAt(p ? new Date().toISOString() : null);
                setFailure(null);
                if (p && fix.status !== "locating") locate();
              }}
              label="Photograph the receipt"
              hint="Flatten it so the litres and total show."
              disabled={sending}
            />

            <div>
              <p className="text-base font-medium text-ink-soft">
                Where did you fuel?
              </p>
              <button
                type="button"
                disabled={sending || stations.length === 0}
                onClick={() => setPickerOpen(true)}
                className={`mt-2 flex min-h-16 w-full items-center gap-3 rounded-[0.625rem] border-2 bg-white p-4 text-left active:bg-surface disabled:opacity-60 ${
                  station ? "border-line" : "border-brand bg-brand-tint"
                }`}
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-[0.625rem] bg-brand-tint text-brand-deep">
                  <Icon name="fuel" className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[1.0625rem] font-semibold leading-snug text-ink">
                    {station ? station.name : "Choose the station"}
                  </span>
                  <span className="mt-0.5 block text-base text-ink-soft">
                    {station ? "Tap to change" : "Pick it from the list"}
                  </span>
                </span>
                <Icon
                  name="chevron-right"
                  className="size-6 shrink-0 text-ink-soft"
                />
              </button>
              {stationsError && (
                <div className="mt-3">
                  <Alert
                    tone="danger"
                    action={
                      <Button
                        variant="secondary"
                        size="md"
                        icon="refresh-cw"
                        onClick={() => void fetchStations()}
                      >
                        Tap to retry
                      </Button>
                    }
                  >
                    {stationsError}
                  </Alert>
                </div>
              )}
            </div>

            <TextField
              label="Litres (if you know)"
              type="text"
              inputMode="decimal"
              value={litersRaw}
              disabled={sending}
              placeholder="180"
              hint={
                litersTruncated
                  ? `Whole litres only — this will be sent as ${litersValue || "0"}.`
                  : "Whole litres only."
              }
              onChange={(e) => {
                setLiters(e.target.value);
                setFailure(null);
              }}
            />

            <TextField
              label="Amount on the receipt (if you know)"
              type="text"
              inputMode="decimal"
              value={amount}
              disabled={sending}
              placeholder="261000"
              hint={
                amountKobo !== null && amountKobo > 0
                  ? `That is ${naira(amountKobo)}.`
                  : "In naira."
              }
              onChange={(e) => {
                setAmount(e.target.value);
                setFailure(null);
              }}
            />

            <GpsLine state={fix} onRetry={locate} />

            {sending && (
              <Progress percent={percent} label="Sending your receipt…" />
            )}

            {failure && (
              <Alert
                tone="danger"
                title="Not sent"
                action={
                  <Button onClick={send} icon="refresh-cw" loading={sending}>
                    Tap to retry
                  </Button>
                }
              >
                {failure}
              </Alert>
            )}

            {!failure && (
              <Button onClick={send} loading={sending} disabled={!ready} icon="check">
                Send this receipt
              </Button>
            )}

            {!photo || !station ? (
              <p className="text-base leading-snug text-ink-soft">
                You need the photo and the station before you can send.
              </p>
            ) : null}
          </>
        )}

        {logged.length > 0 && (
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
              {logged.map((r) => (
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
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>

      {pickerOpen && (
        <StationPicker
          stations={stations}
          onPick={(s) => {
            setStation(s);
            setPickerOpen(false);
            setFailure(null);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

/** Says plainly whether the location will travel with the receipt. */
function GpsLine({ state, onRetry }: { state: FixState; onRetry: () => void }) {
  if (state.status === "ready") {
    return (
      <p className="flex items-center gap-2 text-base text-ink">
        <Icon name="map-pin" className="size-6 shrink-0 text-success" />
        Location and time will be attached.
      </p>
    );
  }
  if (state.status === "locating") {
    return (
      <p className="flex items-center gap-2 text-base text-ink-soft">
        <Icon name="loader-circle" className="size-6 shrink-0 animate-spin" />
        Finding your location…
      </p>
    );
  }
  if (state.status === "unavailable") {
    return (
      <Alert
        tone="warning"
        title="No location"
        action={
          <Button variant="secondary" size="md" onClick={onRetry} icon="refresh-cw">
            Try location again
          </Button>
        }
      >
        {state.reason} The receipt will still be sent, with the time only.
      </Alert>
    );
  }
  return null;
}
