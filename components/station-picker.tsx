"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Station } from "@/lib/types";
import { Icon } from "@/components/ui/icon";

/**
 * Pick the station you fuelled at. There are ~66 of them, so it is searchable;
 * rows are 64px because this gets used at a pump, one-handed, in the sun.
 *
 * It is a full-screen overlay rather than its own route on purpose: the driver
 * reaches it holding an already-captured, already-compressed receipt photo that
 * lives only in memory. Navigating away would throw that photo on the floor and
 * make them retake it.
 *
 * There is no credit/cash anywhere on this screen. The driver picks a PLACE;
 * how it is paid for is the office's business and resolves server-side
 * (invariant §15.5).
 */
export function StationPicker({
  stations,
  onPick,
  onClose,
}: {
  stations: Station[];
  onPick: (station: Station) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Escape closes it for anyone testing on a desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter((s) =>
      `${s.name} ${s.address ?? ""} ${s.ref}`.toLowerCase().includes(q),
    );
  }, [stations, query]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="safe-top border-b border-line">
        <div className="mx-auto flex min-h-16 max-w-lg items-center gap-2 px-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-12 shrink-0 items-center justify-center rounded-[0.625rem] text-ink active:bg-surface"
          >
            <Icon name="x" className="size-6" />
          </button>
          <h2 className="min-w-0 flex-1 truncate font-display text-xl font-semibold text-ink">
            Which station?
          </h2>
        </div>

        <div className="mx-auto max-w-lg px-4 pb-4">
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-ink-soft"
            />
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type the station name"
              aria-label="Search stations"
              className="h-14 w-full rounded-[0.625rem] border-2 border-line bg-white pl-13 pr-4 text-[1.0625rem] text-ink placeholder:text-ink-soft/70 focus:border-brand"
            />
          </div>
        </div>
      </header>

      <div className="safe-bottom mx-auto w-full max-w-lg flex-1 overflow-y-auto overscroll-contain px-4 py-2">
        {matches.length === 0 ? (
          <p className="px-1 py-10 text-center text-base leading-snug text-ink-soft">
            No station matches “{query}”. Check the spelling, or call the office
            if it is missing from the list.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {matches.map((station) => (
              <li key={station.id}>
                <button
                  type="button"
                  onClick={() => onPick(station)}
                  className="flex min-h-16 w-full items-center gap-3 py-3 text-left active:bg-surface"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-[0.625rem] bg-brand-tint text-brand-deep">
                    <Icon name="fuel" className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[1.0625rem] font-semibold leading-snug text-ink">
                      {station.name}
                    </span>
                    {station.address && (
                      <span className="mt-0.5 block truncate text-base text-ink-soft">
                        {station.address}
                      </span>
                    )}
                  </span>
                  <Icon
                    name="chevron-right"
                    className="size-6 shrink-0 text-ink-soft"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
