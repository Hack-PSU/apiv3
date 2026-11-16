/**
 * Runtime configuration for the generated API client.
 *
 * This package deliberately never reads `process.env`. Bundlers such as Next.js
 * only inline `NEXT_PUBLIC_*` into code they compile themselves, and they do not
 * compile `node_modules` by default: so an env read baked into a published
 * package resolves to `undefined` in the consumer's browser bundle. The consuming
 * app reads its own env and hands the values here instead.
 */

export type TokenProvider = () =>
  | string
  | null
  | undefined
  | Promise<string | null | undefined>;

export interface ApiClientConfig {
  /** Base URL of the HackPSU API, e.g. https://api.hackpsu.org. No trailing slash. */
  baseUrl: string;
  /**
   * Returns the bearer token for outgoing requests, or null/undefined to send
   * the request unauthenticated. Called per request so tokens can be refreshed.
   */
  getToken?: TokenProvider;
  /** Extra headers applied to every request. */
  headers?: Record<string, string>;
  /** Swapped out in tests. Defaults to global fetch. */
  fetch?: typeof fetch;
  /** Invoked when the API answers 401, before the error is thrown. */
  onUnauthorized?: () => void;
}

/**
 * Removes trailing slashes with a linear scan. A regex such as /\/+$/ is a
 * polynomial ReDoS on inputs consisting of many slashes.
 */
export function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end--;
  }
  return end === value.length ? value : value.slice(0, end);
}

let config: ApiClientConfig | null = null;

export function configureApiClient(next: ApiClientConfig): void {
  if (!next.baseUrl) {
    throw new Error("configureApiClient: `baseUrl` is required");
  }
  config = { ...next, baseUrl: stripTrailingSlashes(next.baseUrl) };
}

export function getApiClientConfig(): ApiClientConfig {
  if (!config) {
    throw new Error(
      "@hackpsu/api-client has not been configured. Call configureApiClient({ baseUrl, getToken }) " +
        "during app startup: or render <HackPSUProvider> from @hackpsu/react-sdk, which does it for you.",
    );
  }
  return config;
}

export function isApiClientConfigured(): boolean {
  return config !== null;
}

/** Test helper: clears configuration between cases. */
export function resetApiClient(): void {
  config = null;
}

/** Thrown for any non-2xx response. */
export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    super(
      `HackPSU API request failed (${status} ${statusText})` +
        (typeof body === "string" && body ? `: ${body}` : ""),
    );
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}
