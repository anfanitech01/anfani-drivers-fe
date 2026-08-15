"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { PinInput } from "@/components/ui/pin-input";

/**
 * Phone + PIN (TRACKSURE.md §12). Driver accounts are provisioned by Ops — no
 * signup, no password reset link, no email anywhere. If the driver is stuck,
 * the answer is always "call the office", so the screen says that.
 */
export default function LoginPage() {
  const router = useRouter();
  const { driver, loading: sessionLoading, login } = useAuth();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in (the 30-day token survives closing the app): go straight
  // to the trip.
  useEffect(() => {
    if (!sessionLoading && driver) router.replace("/");
  }, [sessionLoading, driver, router]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (submitting || phone.trim().length < 10 || pin.length < 4) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(phone.trim(), pin);
      router.replace("/");
    } catch (err) {
      setPin("");
      if (err instanceof ApiError && err.status === 401) {
        setError("That phone number or PIN is not right. Try again.");
      } else if (err instanceof ApiError && err.status === 403) {
        // Lockout and deactivation both land here; the API's own message names
        // which, including the time the lock lifts.
        setError(err.message);
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Too many tries. Wait one minute, then try again.");
      } else {
        setError(errorMessage(err, "No network. You were NOT signed in. Tap to retry."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="safe-top safe-bottom flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-8 pt-12">
        <Image
          src="/brand/anfani-logo.svg"
          alt="Anfani"
          width={837}
          height={198}
          priority
          className="h-16 w-auto self-center"
        />
        <h1 className="mt-6 text-center font-display text-2xl font-semibold text-ink">
          Tracksure Driver
        </h1>
        <p className="mt-2 text-center text-base text-ink-soft">
          Sign in with your phone number and PIN.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <TextField
            label="Phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0803 000 0001"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError(null);
            }}
            disabled={submitting}
            hint="The number the office has for you."
          />

          <PinInput
            value={pin}
            onChange={(v) => {
              setPin(v);
              setError(null);
            }}
            onComplete={() => void submit()}
            disabled={submitting}
          />

          {error && <Alert tone="danger">{error}</Alert>}

          <Button
            type="submit"
            loading={submitting}
            disabled={phone.trim().length < 10 || pin.length < 4}
          >
            Sign in
          </Button>
        </form>

        <p className="mt-auto pt-10 text-center text-base leading-snug text-ink-soft">
          Forgot your PIN, or locked out? Call the office — they will reset it
          for you.
        </p>
      </div>
    </main>
  );
}
