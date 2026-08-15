import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

/**
 * Status messages in plain words (CLAUDE.md: "No network. Your photo was NOT
 * sent. Tap to retry."). Never smaller than 16px, never on a tint that drops
 * the contrast in sunlight.
 */
type Tone = "danger" | "warning" | "success" | "info" | "blocking";

const tones: Record<Tone, { wrap: string; icon: IconName; iconClass: string }> = {
  danger: {
    wrap: "bg-danger-tint border-danger/30 text-ink",
    icon: "circle-alert",
    iconClass: "text-danger",
  },
  warning: {
    wrap: "bg-warning-tint border-warning/35 text-ink",
    icon: "triangle-alert",
    iconClass: "text-warning",
  },
  success: {
    wrap: "bg-success-tint border-success/30 text-ink",
    icon: "circle-check",
    iconClass: "text-success",
  },
  info: {
    wrap: "bg-info-tint border-info/25 text-ink",
    icon: "circle-alert",
    iconClass: "text-info",
  },
  // The one that has to shout: a declaration is holding up the load.
  blocking: {
    wrap: "bg-white border-brand border-2 text-ink shadow-[var(--shadow-card)]",
    icon: "shield-alert",
    iconClass: "text-brand-deep",
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const t = tones[tone];
  return (
    <div className={`rounded-[0.625rem] border p-4 ${t.wrap}`} role="status">
      <div className="flex gap-3">
        <Icon name={t.icon} className={`size-6 shrink-0 ${t.iconClass}`} />
        <div className="min-w-0 flex-1">
          {title && (
            <p className="font-display text-lg font-semibold leading-tight">
              {title}
            </p>
          )}
          {children && (
            <div className={`text-base leading-snug ${title ? "mt-1" : ""}`}>
              {children}
            </div>
          )}
        </div>
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
