import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./icon";

/**
 * Driver buttons are oversized on purpose (BRAND.md density rule): full-width,
 * 56px tall for the primary action, 48px minimum for everything else, 17px+
 * label. One orange action per screen — `primary` is the only orange variant,
 * so if you find yourself using two on one screen, one of them is wrong.
 */
type Variant = "primary" | "secondary" | "danger" | "quiet";

const base =
  "inline-flex w-full items-center justify-center gap-3 rounded-[0.625rem] " +
  "font-semibold transition-[transform,box-shadow,background-color] duration-150 " +
  "ease-[cubic-bezier(.4,0,.2,1)] active:translate-y-px " +
  "disabled:opacity-50 disabled:pointer-events-none";

const sizes = {
  lg: "min-h-14 px-6 text-[1.0625rem]",
  md: "min-h-12 px-5 text-base",
};

const variants: Record<Variant, string> = {
  primary:
    "text-white bg-[image:var(--grad-brand)] shadow-[var(--glow-brand)] " +
    "hover:brightness-[1.03]",
  secondary: "text-ink bg-white border-2 border-line hover:bg-surface",
  danger: "text-white bg-danger hover:brightness-105",
  quiet: "text-ink-soft bg-transparent hover:bg-surface",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof sizes;
  icon?: IconName;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "lg",
  icon,
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <Icon name="loader-circle" className="size-6 animate-spin" />
      ) : (
        icon && <Icon name={icon} className="size-6 shrink-0" />
      )}
      <span>{children}</span>
    </button>
  );
}

interface ButtonLinkProps {
  href: string;
  variant?: Variant;
  size?: keyof typeof sizes;
  icon?: IconName;
  className?: string;
  children: React.ReactNode;
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "lg",
  icon,
  className = "",
  children,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {icon && <Icon name={icon} className="size-6 shrink-0" />}
      <span>{children}</span>
    </Link>
  );
}
