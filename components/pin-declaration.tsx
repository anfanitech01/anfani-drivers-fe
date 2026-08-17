"use client";

import { useState } from "react";
import { ApiError, errorMessage, request } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PinInput } from "@/components/ui/pin-input";
import { Icon } from "@/components/ui/icon";

/**
 * The digital signature (TRACKSURE.md §6 journey plan): the driver confirms
 * with their own PIN, the coordinator confirms in admin, both timestamped.
 *
 * Same component for both declarations — only the wording and the endpoint
 * differ. The pre-departure one gates loading; the return one never blocks
 * anything, and the copy says so.
 */
type Kind = "pre-trip" | "return";

const copy: Record<
  Kind,
  { heading: string; body: string; cta: string; done: string }
> = {
  "pre-trip": {
    heading: "Declaration before departure",
    body: "I have read the journey plan. I have done the pre-trip checks, the truck and tyres are as recorded, and I am fit to drive.",
    cta: "Sign with my PIN",
    done: "Declared. Waiting for the coordinator.",
  },
  return: {
    heading: "Declaration on return",
    body: "I have delivered the load, the return readings are correct, and I have given my account of anything that happened on the journey.",
    cta: "Sign with my PIN",
    done: "Declared. Waiting for the coordinator.",
  },
};

export function PinDeclaration({
  journeyPlanId,
  kind,
  declaredAt,
  onDeclared,
}: {
  journeyPlanId: string;
  kind: Kind;
  /** ISO timestamp when this driver already signed, if they have. */
  declaredAt?: string | null;
  onDeclared: () => void | Promise<void>;
}) {
  const text = copy[kind];
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (declaredAt) {
    return (
      <Alert tone="success" title="You have signed this">
        {text.done}
      </Alert>
    );
  }

  async function submit() {
    if (pin.length < 4 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await request(
        `/driver-api/journey-plans/${journeyPlanId}/declare/${kind}`,
        // A 401 here is a wrong PIN, not a dead session — never sign them out
        // for a mistype.
        { method: "POST", body: { pin }, signOutOn401: false },
      );
      setPin("");
      await onDeclared();
    } catch (err) {
      // 401 here means the PIN was wrong, not that the session died — say so.
      setError(
        err instanceof ApiError && err.status === 401
          ? "That PIN is not right. Try again."
          : errorMessage(
              err,
              "No network. Your declaration was NOT sent. Tap to retry.",
            ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-[0.625rem] border-2 border-brand bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <Icon name="key-round" className="size-6 text-brand-deep" />
        <h2 className="font-display text-lg font-semibold text-ink">
          {text.heading}
        </h2>
      </div>

      <p className="mt-3 text-base leading-snug text-ink">{text.body}</p>

      <div className="mt-5">
        <PinInput
          value={pin}
          onChange={(v) => {
            setPin(v);
            setError(null);
          }}
          // No auto-submit on the 4th digit: this is the driver's signature on
          // an HSE document. Signing is a press they choose to make.
          label="Enter your PIN to sign"
          disabled={submitting}
        />
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      <div className="mt-5">
        <Button
          onClick={submit}
          loading={submitting}
          disabled={pin.length < 4}
          icon="check"
        >
          {text.cta}
        </Button>
      </div>
    </section>
  );
}
