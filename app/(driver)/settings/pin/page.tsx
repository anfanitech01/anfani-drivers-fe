"use client";

import { useState } from "react";
import { ApiError, errorMessage, request } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { AppBar } from "@/components/ui/app-bar";
import { Button, ButtonLink } from "@/components/ui/button";
import { PinInput } from "@/components/ui/pin-input";

/**
 * Self-service PIN change (POSTMAN_AUTH.md §7). The PIN is both the driver's
 * key and their signature on journey-plan declarations, so the copy treats it
 * as more than a password.
 *
 * Two things the API settled that shape this screen:
 *   - a wrong `currentPin` returns 401, which means "wrong PIN", NOT "session
 *     over" — `signOutOn401: false` keeps a mistype from ejecting the driver;
 *   - the existing token stays valid afterwards, so they are not signed out on
 *     success either. The confirmation says so, because being silently logged
 *     out on the road is exactly what a driver would fear here.
 */
export default function ChangePinPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const filled =
    current.length === 4 && next.length === 4 && confirm.length === 4;

  function clearError() {
    setError(null);
  }

  async function submit() {
    if (!filled || saving) return;

    // Catch what we can before spending the driver's data on a round trip.
    if (next === current) {
      setError("Your new PIN must be different from your current one.");
      return;
    }
    if (next !== confirm) {
      setError("The two new PINs are not the same. Enter them again.");
      setConfirm("");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await request<{ changed: boolean }>("/auth/driver/change-pin", {
        method: "POST",
        body: { currentPin: current, newPin: next },
        // A 401 here is a wrong current PIN, not a dead session.
        signOutOn401: false,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("That is not your current PIN. Try again.");
        setCurrent("");
      } else {
        setError(
          errorMessage(
            err,
            "No network. Your PIN was NOT changed. Tap to retry.",
          ),
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <>
        <AppBar title="Change your PIN" back="/settings" />
        <main className="safe-bottom mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-5">
          <Alert tone="success" title="Your PIN is changed">
            Use the new one next time you sign in, and when you sign a
            declaration. You are still signed in on this phone.
          </Alert>
          <ButtonLink href="/" variant="primary" icon="truck">
            Back to my trip
          </ButtonLink>
        </main>
      </>
    );
  }

  return (
    <>
      <AppBar title="Change your PIN" back="/settings" />

      <main className="safe-bottom mx-auto w-full max-w-lg flex-1 space-y-6 px-4 py-5">
        <p className="text-base leading-snug text-ink">
          Pick 4 numbers you will remember. You use them to sign in, and to sign
          your journey plan declarations — so keep them to yourself.
        </p>

        <PinInput
          label="Your current PIN"
          value={current}
          onChange={(v) => {
            setCurrent(v);
            clearError();
          }}
          disabled={saving}
        />

        <PinInput
          label="Your new PIN"
          value={next}
          onChange={(v) => {
            setNext(v);
            clearError();
          }}
          disabled={saving}
        />

        <PinInput
          label="Type the new PIN again"
          value={confirm}
          onChange={(v) => {
            setConfirm(v);
            clearError();
          }}
          // Deliberately no auto-submit: a mistyped last digit should not fire
          // off a PIN change on its own.
          disabled={saving}
        />

        {error && <Alert tone="danger">{error}</Alert>}

        <Button onClick={submit} loading={saving} disabled={!filled} icon="check">
          Save my new PIN
        </Button>

        <p className="text-base leading-snug text-ink-soft">
          Forgot your current PIN? Call the office — they will reset it for you.
        </p>
      </main>
    </>
  );
}
