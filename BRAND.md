# Anfani / Tracksure — Brand Style Guide

Derived from anfaniafrica.com (Aug 2026). This is the client's real brand; do not invent colors or marks outside this file. Identical copy of this file lives in all three FE repos.

## Logos

In `public/brand/`:

- `anfani-logo.svg` — stacked lockup (837×198). Use for login screens, splash, PDFs.
- `anfani-logo-horizontal.svg` — horizontal lockup (1009×169). Use for nav bars and headers.
- `anfani-favicon.svg` — the standalone mark (their official favicon, 252×270). Also installed as `app/icon.svg` in each app, which Next.js serves as the favicon automatically; use the mark alone anywhere the full lockup is too wide (PWA icon, collapsed sidebar, loading states).

For the driver PWA's manifest, generate 192px and 512px PNG renders of `anfani-favicon.svg` at build-out time (maskable variants padded on white).

- `anfani-logo-horizontal-onlight.svg` — **use this on white/light backgrounds.** The original horizontal lockup's wordmark is #F6F6F6 (near-white, made for dark backgrounds and invisible on white); this variant sets the wordmark to ink (#303030) with the orange mark untouched.

Usage rule: light background → `-onlight` horizontal or the stacked logo (all orange). Dark background → the original horizontal. The marks use a built-in orange gradient (#E5791D → #E8801F); never recolor the mark itself, stretch, or restroke.

## Color palette

| Token | Hex | Role |
|---|---|---|
| `brand` | `#FFA300` | Primary accent: CTAs, active states, highlights, focus rings |
| `brand-deep` | `#E0751A` | Hover/pressed state of brand, gradients paired with `brand` |
| `brand-tint` | `#FEF3EA` | Soft orange background: selected rows, badges, callouts |
| `ink` | `#303030` | Primary text, headings |
| `ink-soft` | `#595959` | Secondary text, labels, placeholders |
| `line` | `#E5E5E4` | Borders, dividers, table rules |
| `surface` | `#F6F6F6` | Page background, cards-on-white alternation |
| `white` | `#FFFFFF` | Cards, nav, content surfaces |

Usage rules:

- Orange is an **accent**, not a wallpaper: one primary orange action per view; everything else neutral. The site itself is white/neutral with orange punctuation; follow that.
- Text on orange: white. Text on tint: `ink`.
- Status colors (not on their site, chosen to harmonize): success `#1E8E3E`, warning `#B26A00` (use `brand-tint` background), danger `#C62828`, info `#1565C0`. Use sparingly against the neutral base.

## Typography

Google Fonts, both variable:

- **Oxanium** — display font. Headings, page titles, big numbers/KPIs, the word "Tracksure". Weights 500–700. Its squared, technical feel is the brand's personality.
- **Albert Sans** — everything else. Body, tables, forms, buttons. Weights 400/500/600/700.

Scale: page title 24–30px Oxanium 600; section heading 18–20px Oxanium 600; body 14–16px Albert Sans 400; table text 13–14px; labels 12–13px Albert Sans 500 uppercase-optional.

## Gradients (v2 — the premium layer)

Gradients are **recipes, not improvisation**: warm, shallow, and only on things that deserve emphasis. Never stack two loud gradients in one view.

| Token | Recipe | Where |
|---|---|---|
| `--grad-brand` | `linear-gradient(135deg,#ffb733 0%,#ffa300 48%,#f08414 100%)` | Primary buttons, active nav pill, icon chips, avatar ring |
| `--grad-bar` | `linear-gradient(180deg,#ffb340,#e0751a)` | Chart fills (current/highlighted series) |
| `--grad-page` | `linear-gradient(180deg,#faf8f5,#f3f1ee)` | Page background (replaces flat surface) |
| `--grad-hero` | `linear-gradient(160deg,#fff8ef,#ffffff 55%,#fdf4e9)` | Page headers / hero bands, plus a soft orange radial orb |
| `--grad-card` | `linear-gradient(180deg,#ffffff,#fdfcfa)` | Card surfaces |
| `--grad-side` | `linear-gradient(180deg,#2e2e33,#26262a 55%,#1f1f23)` | **Admin sidebar (dark charcoal).** The ORIGINAL horizontal logo (white wordmark) lives here natively. |

Supporting effects: `--shadow-card` (soft layered card shadow), `--glow-brand` (`0 6px 20px rgba(255,163,0,.32)` under primary CTAs), KPI corner glows (radial, ≤10% opacity, tinted per tile accent), primary buttons lift 1px on hover. Muted history bars in mini charts use a grey gradient with the current period in `--grad-bar` (color follows meaning).

The admin portal composition: charcoal gradient sidebar with the orange gradient active pill, glass topbar (`rgba(255,255,255,.75)` + backdrop-blur), gradient-ground page, white gradient cards. Exactly one orange action per view still applies.

## Shape and feel

- Radius: `0.625rem` (10px) on cards, buttons, inputs; 14px on the dashboard shell. Pills for status badges.
- Shadows: `--shadow-card` on cards and secondary buttons; `--glow-brand` under primary CTAs; one deeper level for popovers/modals.
- Transitions: 150ms, `cubic-bezier(.4,0,.2,1)` (their defaults).
- Density: admin is data-dense (tables first); client portal is roomier and brandier; driver PWA is oversized (min 48px touch targets, 16px+ text, high contrast, camera-first buttons full-width).

## Tailwind v4 tokens (paste into each app's `globals.css`)

```css
@import "tailwindcss";

@theme {
  --color-brand: #ffa300;
  --color-brand-deep: #e0751a;
  --color-brand-tint: #fef3ea;
  --color-ink: #303030;
  --color-ink-soft: #595959;
  --color-line: #e5e5e4;
  --color-surface: #f6f6f6;
  --color-success: #1e8e3e;
  --color-warning: #b26a00;
  --color-danger: #c62828;
  --color-info: #1565c0;
  --font-sans: "Albert Sans", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Oxanium", ui-sans-serif, system-ui, sans-serif;
  --radius-lg: 0.5rem;
}
```

Next.js font loading (`app/layout.tsx`):

```tsx
import { Albert_Sans, Oxanium } from "next/font/google";
const albert = Albert_Sans({ subsets: ["latin"], variable: "--font-sans" });
const oxanium = Oxanium({ subsets: ["latin"], variable: "--font-display" });
```

## Per-app notes

- **anfani-admin-fe:** `surface` page background, white cards, `line` borders, orange strictly for primary actions, active nav, and pending-approval badges. KPIs in Oxanium.
- **anfani-client-fe:** brandiest of the three; orange hero accents, logo prominent, generous spacing. This is the app Anfani's clients judge them by.
- **anfani-drivers-fe:** white background, `ink` text, oversized orange primary buttons, minimal chrome. Sunlight-readable contrast; never place text on `brand-tint` smaller than 16px here.
- **PDFs (invoices, journey plans):** white background, `anfani-logo.svg` top-left, Oxanium document titles, Albert Sans body, orange only for the header rule and totals row.
