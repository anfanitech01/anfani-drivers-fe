"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js` — the installability + static-asset worker.
 * Registered in production only so `next dev` never serves a stale chunk.
 * See the header comment in sw.js for what it is forbidden from doing.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing costs us the install prompt, nothing more.
    });
  }, []);

  return null;
}
