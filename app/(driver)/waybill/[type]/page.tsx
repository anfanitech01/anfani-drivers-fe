"use client";

import { useCallback, useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { ApiError, errorMessage, upload } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { requestFix, type FixState } from "@/lib/geo";
import type { PreparedPhoto } from "@/lib/photo";
import { useTrip } from "@/lib/trip";
import type { Waybill, WaybillType } from "@/lib/types";
import { PhotoCapture } from "@/components/photo-capture";
import { Alert } from "@/components/ui/alert";
import { AppBar } from "@/components/ui/app-bar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { EmptyState, LoadingScreen } from "@/components/ui/screen-state";

/**
 * Waybill capture (TRACKSURE.md §6 capture engine): camera-first, compressed on
 * the device, GPS + timestamp stamped on every upload, immediate send with real
 * progress.
 *
 * There is no queue. If the upload fails the photo stays on this screen and the
 * driver retries by hand — the screen says, in those words, that it was NOT
 * sent. Walking away loses it, which is the truth of an online-only app and far
 * safer than a silent "saved" that never arrives.
 */
const COPY: Record<
  WaybillType,
  { title: string; capture: string; hint: string; note: string }
> = {
  PRE: {
    title: "Pre-trip waybill",
    capture: "Take the waybill photo",
    hint: "The one the customer gives you at loading.",
    note: "Lay it flat, fill the screen, keep it in focus.",
  },
  POST: {
    title: "Post-trip waybill",
    capture: "Take the signed waybill photo",
    hint: "The one signed at the delivery point.",
    note: "This photo is the delivery confirmation. Make sure the signature shows.",
  },
};

export default function WaybillPage() {
  const routeType = String(useParams().type ?? "").toUpperCase();
  // Only `/waybill/pre` and `/waybill/post` exist. Resolved before the hooks so
  // they all still run unconditionally; the 404 is raised after them.
  const type: WaybillType = routeType === "POST" ? "POST" : "PRE";
  const copy = COPY[type];

  const { data, loading, reload } = useTrip();
  const trip = data?.trip ?? null;

  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [fix, setFix] = useState<FixState>({ status: "locating" });
  const [percent, setPercent] = useState(0);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState<Waybill | null>(null);

  const askForFix = useCallback(() => {
    requestFix()
      .then((f) => setFix({ status: "ready", fix: f }))
      .catch((err: Error) =>
        setFix({ status: "unavailable", reason: err.message }),
      );
  }, []);

  /** Retry button / re-locate after a capture: shows the spinner first. */
  const locate = useCallback(() => {
    setFix({ status: "locating" });
    askForFix();
  }, [askForFix]);

  // Warm the GPS as soon as the screen opens: by the time the photo is taken,
  // the fix is usually already in hand. State starts at "locating", so this
  // effect sets nothing synchronously.
  useEffect(() => {
    askForFix();
  }, [askForFix]);

  async function send() {
    if (!photo || !trip || sending) return;
    setSending(true);
    setFailure(null);
    setPercent(0);

    const form = new FormData();
    form.append("photo", photo.file);
    form.append("type", type);
    form.append("capturedAt", capturedAt ?? new Date().toISOString());
    form.append("qualityCheckPassed", String(photo.quality.passed));
    if (fix.status === "ready") {
      form.append("gpsLat", String(fix.fix.lat));
      form.append("gpsLng", String(fix.fix.lng));
    }

    try {
      const result = await upload<Waybill>(
        `/driver-api/trips/${trip.id}/waybills`,
        form,
        { onProgress: setPercent },
      );
      setSent(result);
      setPhoto(null);
      await reload();
    } catch (err) {
      setFailure(
        err instanceof ApiError && err.isOffline
          ? "No network. Your photo was NOT sent. Tap to retry."
          : errorMessage(
              err,
              "No network. Your photo was NOT sent. Tap to retry.",
            ),
      );
    } finally {
      setSending(false);
    }
  }

  if (routeType !== "PRE" && routeType !== "POST") notFound();

  if (loading && !data) return <LoadingScreen />;

  if (!trip) {
    return (
      <>
        <AppBar title={copy.title} />
        <EmptyState icon="camera" title="No trip right now">
          Waybills attach to a trip. You will see this again on your next load.
        </EmptyState>
      </>
    );
  }

  const already = (trip.waybills ?? []).filter((w) => w.type === type);

  return (
    <>
      <AppBar title={copy.title} />

      <main className="safe-bottom mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-5">
        {sent ? (
          <>
            <Alert tone="success" title="Photo sent">
              Saved against {trip.ref}
              {sent.ref ? ` as ${sent.ref}` : ""}.
            </Alert>

            {/* The GPS cross-check is a flag, never a block (§6). */}
            {sent.gpsMatchesDestination === false && (
              <Alert tone="warning" title="Taken away from the destination">
                {typeof sent.distanceFromDestinationKm === "number"
                  ? `About ${Math.round(sent.distanceFromDestinationKm)} km from the delivery point. `
                  : ""}
                The office will see this. Nothing for you to do.
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                variant="secondary"
                icon="camera"
                onClick={() => {
                  setSent(null);
                  setPercent(0);
                }}
              >
                Take another
              </Button>
              <ButtonLink href="/" variant="primary" icon="truck">
                Back to my trip
              </ButtonLink>
            </div>
          </>
        ) : (
          <>
            <p className="text-base leading-snug text-ink">{copy.note}</p>

            <PhotoCapture
              photo={photo}
              onChange={(p) => {
                setPhoto(p);
                setCapturedAt(p ? new Date().toISOString() : null);
                setFailure(null);
                // A fresh capture deserves a fresh fix — the truck has moved.
                if (p && fix.status !== "locating") locate();
              }}
              label={copy.capture}
              hint={copy.hint}
              disabled={sending}
            />

            <GpsLine state={fix} onRetry={locate} />

            {sending && (
              <Progress percent={percent} label="Sending your photo…" />
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

            {photo && !failure && (
              <Button onClick={send} loading={sending} icon="check">
                Send this photo
              </Button>
            )}
          </>
        )}

        {already.length > 0 && (
          <Card>
            <CardTitle>Already sent for this trip</CardTitle>
            <ul className="mt-3 space-y-3">
              {already.map((w) => (
                <li key={w.id} className="flex items-start gap-3">
                  <Icon
                    name="circle-check"
                    className="mt-0.5 size-6 shrink-0 text-success"
                  />
                  <div>
                    <p className="text-[1.0625rem] font-semibold text-ink">
                      {w.ref}
                    </p>
                    {w.capturedAt && (
                      <p className="text-base text-ink-soft">
                        {formatDateTime(w.capturedAt)}
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

/** Says plainly whether the location will travel with the photo. */
function GpsLine({
  state,
  onRetry,
}: {
  state: FixState;
  onRetry: () => void;
}) {
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
        {state.reason} The photo will still be sent, with the time only.
      </Alert>
    );
  }
  return null;
}
