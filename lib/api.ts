/**
 * Thin transport over the Tracksure API (anfani-be). The backend owns every
 * business rule; this file only carries bytes and types.
 *
 * Online-only by contract (§12/§19): there is no queue, no retry timer and no
 * local copy of business data in here. A failed request stays failed and the
 * screen tells the driver the truth.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "tracksure.driver.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/** The driver token lasts 30 days — the PWA is their tool all day, every day. */
export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** Status 0 means the request never reached the server: no data connection. */
  get isOffline(): boolean {
    return this.status === 0;
  }
}

export const OFFLINE_MESSAGE = "No network. Nothing was sent. Tap to retry.";

/** Subscribers (the auth provider) get told when a token stops working. */
const unauthorizedHandlers = new Set<() => void>();

export function onUnauthorized(handler: () => void) {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

function notifyUnauthorized() {
  clearToken();
  unauthorizedHandlers.forEach((h) => h());
}

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === "string") return m;
    if (Array.isArray(m) && m.length) return m.join(", ");
  }
  return fallback;
}

function parse(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(
    path.startsWith("/") ? path : `/${path}`,
    API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Login posts before a token exists. */
  auth?: boolean;
  /**
   * On the declaration endpoints a 401 means "wrong PIN", not "your session is
   * over" (POSTMAN_DRIVER_API.md §3). Those calls pass `false` so a mistyped
   * PIN does not throw the driver back to the login screen.
   */
  signOutOn401?: boolean;
  signal?: AbortSignal;
}

export async function request<T>(
  path: string,
  {
    method = "GET",
    body,
    query,
    auth = true,
    signOutOn401 = true,
    signal,
  }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new ApiError(0, OFFLINE_MESSAGE);
  }

  const payload = parse(await res.text());

  if (!res.ok) {
    if (res.status === 401 && auth && signOutOn401) notifyUnauthorized();
    throw new ApiError(
      res.status,
      messageFrom(payload, `Something went wrong (${res.status}).`),
      payload,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) =>
    request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
};

/**
 * Multipart upload with real progress. `fetch` cannot report upload progress,
 * and a driver watching a photo climb from 0% on a weak network is the whole
 * point of the screen — so this one path uses XMLHttpRequest.
 */
export function upload<T>(
  path: string,
  form: FormData,
  {
    onProgress,
    signal,
  }: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", buildUrl(path));

    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    // Content-Type is left to the browser: it must add the multipart boundary.

    xhr.upload.addEventListener("progress", (e) => {
      if (!onProgress) return;
      // Cap at 99: the last percent belongs to the server's reply, and telling
      // a driver "100%" before the API has accepted the photo would be a lie.
      onProgress(
        e.lengthComputable ? Math.min(99, Math.round((e.loaded / e.total) * 100)) : 0,
      );
    });

    xhr.addEventListener("load", () => {
      const payload = parse(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(payload as T);
        return;
      }
      if (xhr.status === 401) notifyUnauthorized();
      reject(
        new ApiError(
          xhr.status,
          messageFrom(payload, `Upload failed (${xhr.status}).`),
          payload,
        ),
      );
    });

    xhr.addEventListener("error", () =>
      reject(new ApiError(0, OFFLINE_MESSAGE)),
    );
    xhr.addEventListener("timeout", () =>
      reject(new ApiError(0, OFFLINE_MESSAGE)),
    );
    xhr.addEventListener("abort", () => {
      const err = new Error("Upload cancelled");
      err.name = "AbortError";
      reject(err);
    });

    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}

/** The plain-words message for any failure, ready to show on screen. */
export function errorMessage(err: unknown, offlineLine: string): string {
  if (err instanceof ApiError) return err.isOffline ? offlineLine : err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Tap to retry.";
}
