"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "./icon";

/**
 * Minimal chrome: a back arrow, the screen's name, and nothing else. No tabs,
 * no dashboard, no breadcrumbs — one screen, one job.
 */
export function AppBar({
  title,
  back = "/",
  action,
}: {
  title: string;
  /** Route to go back to, or `false` for a root screen. */
  back?: string | false;
  action?: ReactNode;
}) {
  const router = useRouter();

  return (
    <header className="safe-top sticky top-0 z-10 border-b border-line bg-white">
      <div className="mx-auto flex min-h-16 max-w-lg items-center gap-2 px-2">
        {back !== false && (
          <button
            type="button"
            onClick={() => router.push(back)}
            aria-label="Back"
            className="flex size-12 shrink-0 items-center justify-center rounded-[0.625rem] text-ink active:bg-surface"
          >
            <Icon name="arrow-left" className="size-6" />
          </button>
        )}
        <h1
          className={`min-w-0 flex-1 truncate font-display text-xl font-semibold text-ink ${
            back === false ? "px-3" : ""
          }`}
        >
          {title}
        </h1>
        {action}
      </div>
    </header>
  );
}
