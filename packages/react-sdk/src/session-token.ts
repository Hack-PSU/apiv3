/**
 * Session token handling for destinations that cannot use the auth service's
 * cookie.
 *
 * The cookie is scoped to `.hackpsu.org`, so a developer running on localhost,
 * or a Vercel preview deployment, can never read it. For those the auth service
 * returns the session as a token and appends it to the redirect as `authToken`.
 * This module captures that token, keeps it for the session, and strips it from
 * the URL so it does not linger in the address bar, history or referrer.
 *
 * On hackpsu.org itself none of this runs: the cookie works, no token is issued,
 * and `getSessionToken()` stays undefined.
 */

const STORAGE_KEY = "hackpsu.sessionToken";
const QUERY_PARAM = "authToken";

let cached: string | undefined;

function readStorage(): string | undefined {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    // Private windows and blocked storage both throw; the in-memory copy still
    // covers the current page.
    return undefined;
  }
}

function writeStorage(token: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Not fatal: the token survives in memory until the next full navigation.
  }
}

/**
 * Takes the token out of the URL if the auth service put one there, and removes
 * the parameter from the address bar without adding a history entry.
 */
export function captureSessionToken(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const url = new URL(window.location.href);
  const token = url.searchParams.get(QUERY_PARAM);

  if (token) {
    cached = token;
    writeStorage(token);
    url.searchParams.delete(QUERY_PARAM);
    window.history.replaceState({}, "", url.toString());
    return token;
  }

  cached ??= readStorage();
  return cached;
}

export function getSessionToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return (cached ??= readStorage());
}

export function clearSessionToken(): void {
  cached = undefined;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage was never writable.
  }
}

/**
 * Adds the bearer header when a token is held. On production there is none, so
 * the request goes out with the cookie alone exactly as before.
 */
export function withSessionAuth(headers: Record<string, string> = {}) {
  const token = getSessionToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}
