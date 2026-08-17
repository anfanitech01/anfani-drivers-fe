/** Display helpers. Every date is Africa/Lagos — the only clock that matters. */

const lagosDate = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  weekday: "short",
  day: "numeric",
  month: "short",
});

const lagosDateTime = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const lagosTime = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function formatDate(d: Date | string): string {
  return lagosDate.format(typeof d === "string" ? new Date(d) : d);
}

export function formatDateTime(d: Date | string): string {
  return lagosDateTime.format(typeof d === "string" ? new Date(d) : d);
}

export function formatTime(d: Date | string): string {
  return lagosTime.format(typeof d === "string" ? new Date(d) : d);
}

export function formatKm(km: number): string {
  return `${km.toLocaleString("en-NG")} km`;
}

export function formatLiters(l: number): string {
  return `${l.toLocaleString("en-NG")} litres`;
}

const nairaFmt = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

/**
 * Money reaches this app as integer kobo and is divided by 100 only here, at
 * render. Drivers see very little money — a fuel receipt total they typed
 * themselves is about the extent of it.
 */
export function naira(kobo: number): string {
  return nairaFmt.format(kobo / 100);
}

/**
 * "in 6 days" / "2 days late" — drivers read the gap, not the calendar.
 * Whole days, rounded, because an ETA is a ~7-day convention, not a promise.
 */
export function daysUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.round(ms / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "1 day late";
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days late`;
}

/** `+2348030000001` → `+234 803 000 0001`, easier to check on a small screen. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("234")) {
    return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return phone;
}
