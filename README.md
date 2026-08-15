# anfani-drivers-fe

Tracksure Driver PWA (Workstream C) for Anfani Transport drivers. Installable to the home screen, online-only — no offline data caching. PIN login, current trip view, waybill and fuel receipt capture, complaints. Talks to `anfani-be`.

Web app manifest lives at `app/manifest.ts`. Install icons (192/512) and the service worker for installability are still to be added.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```
