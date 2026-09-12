/**
 * @hackpsu/api-client
 *
 * Typed client for the HackPSU API v3, generated from the API's own OpenAPI
 * document. Everything under `./generated` is produced by `npm run generate`
 * and must not be hand-edited: change the NestJS controller or entity instead
 * and regenerate.
 *
 * @example
 * import { configureApiClient, useEventGetAll } from "@hackpsu/api-client";
 *
 * configureApiClient({
 *   baseUrl: process.env.NEXT_PUBLIC_BASE_URL_V3!,
 *   getToken: () => auth.currentUser?.getIdToken() ?? null,
 * });
 *
 * const { data: events } = useEventGetAll({ hackathonId });
 */

export {
  configureApiClient,
  getApiClientConfig,
  isApiClientConfigured,
  resetApiClient,
  ApiError,
} from "./runtime";
export type { ApiClientConfig, TokenProvider } from "./runtime";

export { customFetch } from "./fetcher";

// Operations and hooks, grouped by API tag.
export * from "./generated";

// Request/response models (EventEntityResponse, HackathonEntity, ...).
export * from "./generated/model";
