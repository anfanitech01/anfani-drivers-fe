import type { ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./icon";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[0.625rem] border border-line bg-[image:var(--grad-card)] p-5 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-lg font-semibold text-ink">{children}</h2>
  );
}

/**
 * A labelled line of trip facts. Label above value, both left-aligned — a
 * two-column table is unreadable on a phone held at arm's length in a cab.
 */
export function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="flex gap-3 py-3">
      {icon && (
        <Icon name={icon} className="mt-0.5 size-6 shrink-0 text-brand-deep" />
      )}
      <div className="min-w-0">
        <p className="text-base font-medium text-ink-soft">{label}</p>
        <div className="mt-0.5 text-[1.0625rem] font-semibold leading-snug text-ink">
          {value}
        </div>
      </div>
    </div>
  );
}

/**
 * The home screen's action tiles: full-width, icon + short label, 64px tall.
 * Icons with short labels beat sentences (the quick-start guide is visual).
 */
export function ActionTile({
  href,
  icon,
  title,
  note,
  tone = "normal",
}: {
  href: string;
  icon: IconName;
  title: string;
  note?: string;
  tone?: "normal" | "attention";
}) {
  const attention = tone === "attention";
  return (
    <Link
      href={href}
      className={`flex min-h-16 items-center gap-4 rounded-[0.625rem] border-2 bg-white p-4 transition-colors duration-150 active:bg-surface ${
        attention ? "border-brand bg-brand-tint" : "border-line"
      }`}
    >
      <span
        className={`flex size-12 shrink-0 items-center justify-center rounded-[0.625rem] ${
          attention
            ? "bg-[image:var(--grad-brand)] text-white"
            : "bg-brand-tint text-brand-deep"
        }`}
      >
        <Icon name={icon} className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.0625rem] font-semibold text-ink">
          {title}
        </span>
        {note && (
          <span className="mt-0.5 block text-base leading-snug text-ink-soft">
            {note}
          </span>
        )}
      </span>
      <Icon name="chevron-right" className="size-6 shrink-0 text-ink-soft" />
    </Link>
  );
}
