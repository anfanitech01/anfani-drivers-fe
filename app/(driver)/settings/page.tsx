"use client";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { AppBar } from "@/components/ui/app-bar";
import { ActionTile, Card } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/screen-state";

/**
 * The driver's own account. Deliberately thin: a driver record is owned by
 * Operations (§5.3) — name, phone, licence and DDT dates are all theirs to
 * edit — so the only thing a driver can change from here is their PIN.
 *
 * Everything shown comes from `GET /auth/me`, which the session already
 * bootstraps. Nothing is stored on the device but the token.
 */
export default function SettingsPage() {
  const { driver, logout } = useAuth();

  if (!driver) return <LoadingScreen />;

  const initials = driver.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <>
      <AppBar title="Your account" />

      <main className="safe-bottom mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-5">
        <Card>
          <div className="flex items-center gap-4">
            <span
              className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[image:var(--grad-brand)] font-display text-xl font-semibold text-white"
              aria-hidden
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="font-display text-2xl font-semibold leading-tight text-ink">
                {driver.name}
              </p>
              <p className="mt-0.5 text-base text-ink-soft">
                Driver · {driver.ref}
              </p>
            </div>
          </div>
        </Card>

        <p className="text-base leading-snug text-ink-soft">
          The office keeps your records. If your name, phone number or licence
          details are wrong, call them — you cannot change those here.
        </p>

        <ActionTile
          href="/settings/pin"
          icon="key-round"
          title="Change my PIN"
          note="You will need your current one"
        />

        <div className="pt-4">
          <Button variant="secondary" icon="log-out" onClick={logout}>
            Sign out
          </Button>
          <p className="mt-3 text-base leading-snug text-ink-soft">
            You will need your phone number and PIN to get back in.
          </p>
        </div>
      </main>
    </>
  );
}
