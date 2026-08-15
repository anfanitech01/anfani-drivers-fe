/**
 * GPS fix for the waybill capture engine (TRACKSURE.md §6: "GPS coordinates +
 * timestamp stamped on every upload").
 *
 * The fix is best-effort by design. The API takes `gpsLat`/`gpsLng` as optional
 * and cross-checks post-trip captures against the destination — a mismatch is
 * flagged, never blocked. So a driver in a metal container with no fix still
 * gets their waybill in; the screen just says the location was not attached.
 */

export interface Fix {
  lat: number;
  lng: number;
  accuracyM: number;
  at: number;
}

export type FixState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ready"; fix: Fix }
  | { status: "unavailable"; reason: string };

const TIMEOUT_MS = 12_000;

export function requestFix(): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This phone cannot share its location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          at: pos.timestamp,
        }),
      (err) => reject(new Error(reasonFor(err))),
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 30_000 },
    );
  });
}

function reasonFor(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location is switched off for this app.";
    case err.POSITION_UNAVAILABLE:
      return "No GPS signal here.";
    case err.TIMEOUT:
      return "GPS is taking too long.";
    default:
      return "Location not available.";
  }
}
