"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { violationLabels, humanise, type Violation } from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";

/**
 * A violation raised against the trip, plus the driver's side of the story
 * (§6: the feedback travels with the violation into the driver profile).
 * Read-only once sent — this is a statement, not a note to edit later.
 */
export function ViolationFeedback({
  violation,
  onSaved,
}: {
  violation: Violation;
  onSaved: () => void | Promise<void>;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (text.trim().length < 2 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/driver-api/violations/${violation.id}/feedback`, {
        driverFeedback: text.trim(),
      });
      setText("");
      setOpen(false);
      await onSaved();
    } catch (err) {
      setError(
        errorMessage(err, "No network. Your answer was NOT sent. Tap to retry."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[0.625rem] border border-line bg-white p-4">
      <p className="font-display text-lg font-semibold text-ink">
        {violationLabels[violation.type] ?? humanise(violation.type)}
      </p>
      <p className="mt-1 text-base text-ink-soft">
        {violation.occurrences ? `${violation.occurrences} time(s)` : "Recorded"}
        {violation.locations ? ` · ${violation.locations}` : ""}
        {violation.at ? ` · ${formatDateTime(violation.at)}` : ""}
      </p>

      {violation.driverFeedback ? (
        <div className="mt-3 rounded-[0.625rem] bg-surface p-3">
          <p className="text-base font-medium text-ink-soft">You said</p>
          <p className="mt-1 text-base leading-snug text-ink">
            {violation.driverFeedback}
          </p>
        </div>
      ) : open ? (
        <div className="mt-4 space-y-4">
          <TextArea
            label="What happened?"
            value={text}
            maxLength={2000}
            disabled={saving}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            placeholder="Tell the office your side of it."
          />
          {error && <Alert tone="danger">{error}</Alert>}
          <Button
            onClick={submit}
            loading={saving}
            disabled={text.trim().length < 2}
            size="md"
          >
            Send my answer
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <Button variant="secondary" size="md" onClick={() => setOpen(true)}>
            Give your side
          </Button>
        </div>
      )}
    </div>
  );
}
