import type { ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { Button } from "./button";
import { Icon, type IconName } from "./icon";

/** Skeleton stand-in while the trip loads. Shape only, no fake content. */
export function LoadingScreen() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-2/3" />
      <div className="skeleton h-40 w-full rounded-[0.625rem]" />
      <div className="skeleton h-16 w-full rounded-[0.625rem]" />
      <div className="skeleton h-16 w-full rounded-[0.625rem]" />
    </div>
  );
}

/**
 * The honest failure screen. A dead network is named as a dead network — never
 * "something went wrong", never a cached page pretending everything is fine.
 */
export function ErrorScreen({
  error,
  onRetry,
  what = "load this",
}: {
  error: unknown;
  onRetry: () => void;
  what?: string;
}) {
  const offline = error instanceof ApiError && error.isOffline;
  const message =
    error instanceof ApiError
      ? error.message
      : `Could not ${what}. Tap to try again.`;

  return (
    <div className="p-4">
      <div className="rounded-[0.625rem] border-2 border-danger/30 bg-danger-tint p-5">
        <Icon
          name={offline ? "wifi-off" : "circle-alert"}
          className="size-8 text-danger"
        />
        <p className="mt-3 font-display text-xl font-semibold text-ink">
          {offline ? "No network" : "Could not load"}
        </p>
        <p className="mt-1 text-base leading-snug text-ink">
          {offline ? `You need a data connection to ${what}.` : message}
        </p>
        <div className="mt-5">
          <Button onClick={onRetry} icon="refresh-cw">
            Tap to retry
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-4 py-12 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-tint text-brand-deep">
        <Icon name={icon} className="size-8" />
      </span>
      <p className="mt-4 font-display text-xl font-semibold text-ink">{title}</p>
      {children && (
        <div className="mx-auto mt-2 max-w-xs text-base leading-snug text-ink-soft">
          {children}
        </div>
      )}
    </div>
  );
}
