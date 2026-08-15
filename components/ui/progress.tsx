/**
 * Upload progress. Real numbers only — the bar is fed by the XHR upload event
 * and stops at 99% until the server has actually accepted the file.
 */
export function Progress({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-base font-medium text-ink">{label}</p>
        <p className="font-display text-lg font-semibold tabular-nums text-ink">
          {percent}%
        </p>
      </div>
      <div
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-[image:var(--grad-bar)] transition-[width] duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
