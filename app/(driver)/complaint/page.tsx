"use client";

import { useState } from "react";
import { ApiError, errorMessage, upload } from "@/lib/api";
import type { PreparedPhoto } from "@/lib/photo";
import { useTrip } from "@/lib/trip";
import type { Complaint } from "@/lib/types";
import { PhotoCapture } from "@/components/photo-capture";
import { Alert } from "@/components/ui/alert";
import { AppBar } from "@/components/ui/app-bar";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { EmptyState, LoadingScreen } from "@/components/ui/screen-state";

/**
 * Complaints and incident reports from the road (§6): text, plus a photo if it
 * helps. No voice notes — superseded, §19.
 *
 * A breakdown reported here reaches Operations, who flip the truck's status.
 * The driver never edits truck records, so the screen does not pretend to.
 */
export default function ComplaintPage() {
  const { data, loading, reload } = useTrip();
  const trip = data?.trip ?? null;

  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [percent, setPercent] = useState(0);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState<Complaint | null>(null);

  async function send() {
    if (!trip || text.trim().length < 2 || sending) return;
    setSending(true);
    setFailure(null);
    setPercent(0);

    const form = new FormData();
    form.append("text", text.trim());
    if (photo) form.append("photo", photo.file);

    try {
      const result = await upload<Complaint>(
        `/driver-api/trips/${trip.id}/complaints`,
        form,
        { onProgress: setPercent },
      );
      setSent(result);
      setText("");
      setPhoto(null);
      await reload();
    } catch (err) {
      setFailure(
        err instanceof ApiError && err.isOffline
          ? "No network. Your report was NOT sent. Tap to retry."
          : errorMessage(
              err,
              "No network. Your report was NOT sent. Tap to retry.",
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
        <AppBar title="Report a problem" />
        <EmptyState icon="message-square-warning" title="No trip right now">
          Reports attach to the trip you are on. Call the office if something is
          wrong between trips.
        </EmptyState>
      </>
    );
  }

  if (sent) {
    return (
      <>
        <AppBar title="Report a problem" />
        <main className="safe-bottom mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-5">
          <Alert tone="success" title="Sent to the office">
            Your report is on {trip.ref}. Operations can see it now.
          </Alert>
          <div className="space-y-3">
            <Button
              variant="secondary"
              onClick={() => {
                setSent(null);
                setPercent(0);
              }}
            >
              Report something else
            </Button>
            <ButtonLink href="/" variant="primary" icon="truck">
              Back to my trip
            </ButtonLink>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppBar title="Report a problem" />

      <main className="safe-bottom mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-5">
        <p className="text-base leading-snug text-ink">
          Breakdown, delay, trouble at the depot — tell the office. It goes on{" "}
          {trip.ref}.
        </p>

        <TextArea
          label="What happened?"
          value={text}
          maxLength={2000}
          disabled={sending}
          placeholder="Write it in your own words."
          onChange={(e) => {
            setText(e.target.value);
            setFailure(null);
          }}
        />

        <PhotoCapture
          photo={photo}
          onChange={(p) => {
            setPhoto(p);
            setFailure(null);
          }}
          label="Add a photo"
          hint="Only if it helps them understand."
          required={false}
          disabled={sending}
        />

        {sending && <Progress percent={percent} label="Sending your report…" />}

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
          <Button
            onClick={send}
            loading={sending}
            disabled={text.trim().length < 2}
            icon="check"
          >
            Send to the office
          </Button>
        )}
      </main>
    </>
  );
}
