@AGENTS.md

# CLAUDE.md — anfani-drivers-fe (Tracksure Driver PWA)

## What this app is

The driver-facing **Progressive Web App** of Tracksure, used by Anfani Transport's ~19 truck drivers on the road. It is the app the whole data pipeline depends on: waybill photos, fuel receipts, journey plan declarations, and complaints all enter the system here. Built for drivers, not office workers: they are on cheap Android phones, in sunlight, on weak networks, often mid-journey.

**The product spec is `TRACKSURE.md` in the backend repo: `~/Documents/backend/anfani-be/TRACKSURE.md`** (§12 is the driver PWA section). The backend owns all logic; this app captures and displays.

## What this app is contractually (do not drift)

- A **PWA**: browser-accessed, installable to the home screen on Android and iOS. **No app store distribution. No native code.**
- **Online-only.** An active data connection is required for use; this is written into the contract. **Do NOT build offline-first features**: no sync queues, no background sync, no local persistence of business data, no optimistic offline capture. The service worker exists ONLY for installability and static-asset caching. If a request fails, show a clear retry state; never fake success.
- **No voice notes.** Complaints are text + photo only.

## Stack and conventions

- Next.js App Router + TypeScript + Tailwind v4. Brand tokens in **`BRAND.md`** (repo root). Manifest + icons: the mark is `public/brand/anfani-favicon.svg` and `app/icon.svg`; generate 192px and 512px maskable PNGs for the manifest (an acceptance criterion is installing to the home screen).
- Auth: **phone number + PIN (4–6 digits)**, biometric unlock where the browser supports it, PIN always the fallback. Long-lived session on the device; driver accounts are auto-provisioned when Ops creates the driver, no signup flow.
- Money is rarely shown here; when it is, kobo → naira at render. Dates in Africa/Lagos.
- **Compress photos client-side before upload** (drivers pay for data); capture GPS + timestamp with every photo per the waybill capture engine (§6): quality check at capture, permanent storage against the trip.

## The screens (spec §12)

- **Current trip**: route, stops, destination, expected ETA, trip status. One trip at a time; this is the home screen.
- **Journey plan**: view the plan (route, hazards, special instructions); **pre-departure declaration by PIN** (this gates loading, show clearly when it is pending); rest stop entries; **return declaration by PIN** after delivery; trip conclusion contribution; driver feedback on violations. Pending finalization shows as a reminder, never a block.
- **Waybill capture**: pre-trip and post-trip photo capture, camera-first, automatic GPS + timestamp, immediate upload with progress and retry.
- **Fuel stop**: photograph the receipt, pick the station from a list; credit/cash resolves automatically from the station record, the driver never chooses it.
- **Complaints / incidents**: text + photo against the current trip; breakdown reporting flips truck status and alerts Ops.
- **Trip complete summary**: km (from the KM sheet), fuel logged vs estimate, shown at trip end.

## Design language (BRAND.md, driver rules)

White background, `ink` text, **minimum 48px touch targets**, body text 16px+, full-width orange primary buttons, one action per screen wherever possible, icons + short labels over sentences (the quick-start guide is visual for a reason). High contrast for sunlight. Camera buttons huge. Loading and error states in plain words ("No network. Your photo was NOT sent. Tap to retry."). Minimal chrome; no dashboards, no tables.

## Do not

Build offline sync or local business-data persistence; add voice recording; add a breathalyzer field; block the next trip on journey-plan finalization (reminder only; the pre-trip declaration gate is the backend's job); show other drivers' data or any financial internals; introduce colors/fonts outside BRAND.md; small tap targets or dense layouts.

## Design review is LOCAL-ONLY

Never push this project's components, designs, or data to claude.ai (no claude.ai/design sync, no published artifacts) — the account is shared. The design system is reviewed via a dev-only `/design` gallery route rendering the component library on BRAND.md tokens, excluded from production builds, viewed on localhost.

## Working rules (every session, every build)

1. **Track your work with the todo/task checklist tools** — break the build into checklist items up front and keep them updated.
2. **NEVER commit or push.** Nosa reviews everything manually and commits himself. No exceptions unless he explicitly asks in the session.
3. **End every build with a report:** Built (what was created, one line each) · Test this (concrete manual checklist: which screens to open, what to click/enter, what should happen, per-role checks where relevant) · Decisions/ambiguities (anything the spec did not pin down, flagged for review).
