import { tripStatusLabels, type TripStatus } from "@/lib/types";

/**
 * Trip status as a pill. Orange only for the states that need the driver to do
 * something; everything else stays neutral so the one orange action per screen
 * keeps its meaning.
 */
const tones: Record<TripStatus, string> = {
  PENDING: "bg-surface text-ink-soft border-line",
  ASSIGNED: "bg-brand-tint text-ink border-brand",
  LOADING: "bg-brand-tint text-ink border-brand",
  IN_TRANSIT: "bg-info-tint text-ink border-info/40",
  DELIVERED: "bg-success-tint text-ink border-success/40",
};

export function StatusPill({ status }: { status: TripStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-4 py-1.5 text-base font-semibold ${
        tones[status] ?? tones.PENDING
      }`}
    >
      {tripStatusLabels[status] ?? status}
    </span>
  );
}
