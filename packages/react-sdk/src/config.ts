import type { FirebaseOptions } from "firebase/app";
import { stripTrailingSlashes } from "@hackpsu/api-client";

/**
 * Permission levels, mirroring `Role` in the API (src/common/gcp/auth/firebase-auth.types.ts).
 * Ordered, so `userRole >= minimumRole` is the authorization test.
 */
export enum Role {
  NONE = 0,
  VOLUNTEER = 1,
  TEAM = 2,
  EXEC = 3,
  TECH = 4,
  FINANCE = 5,
}

export const DEFAULT_AUTH_SERVICE_URL = "https://auth.hackpsu.org";

export interface HackPSUConfig {
  /**
   * Firebase web config. The consuming app must pass these explicitly: bundlers
   * only inline `NEXT_PUBLIC_*` into code they compile, and they do not compile
   * `node_modules`, so a package that read env itself would receive `undefined`.
   */
  firebase: FirebaseOptions;

  /** Base URL of the HackPSU API, e.g. https://api.hackpsu.org. */
  apiBaseUrl: string;

  /** Central SSO service. Defaults to https://auth.hackpsu.org. */
  authServiceUrl?: string;

  /** Minimum role required to view the app. Defaults to `Role.NONE`. */
  minimumRole?: Role;

  /** Send the viewer to the auth service automatically. Defaults to "immediate". */
  redirectMode?: "immediate" | "manual";

  /** Render the built-in loading screen while authenticating. Defaults to true. */
  showLoadingScreen?: boolean;

  /** Milliseconds before a stalled session check is retried. Defaults to 8000. */
  loadingTimeout?: number;

  /** Identify/reset the signed-in user in PostHog. Defaults to true. */
  posthog?: boolean;
}

export type ResolvedHackPSUConfig = HackPSUConfig &
  Required<
    Pick<
      HackPSUConfig,
      | "authServiceUrl"
      | "minimumRole"
      | "redirectMode"
      | "showLoadingScreen"
      | "loadingTimeout"
      | "posthog"
    >
  >;

export function resolveConfig(config: HackPSUConfig): ResolvedHackPSUConfig {
  if (!config?.firebase?.apiKey) {
    throw new Error(
      "HackPSUProvider: `config.firebase.apiKey` is missing. Pass your Firebase web " +
        "config explicitly from the app: for example " +
        "{ apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, ... }. Reading env inside " +
        "this package does not work, because bundlers do not compile node_modules.",
    );
  }

  if (!config.apiBaseUrl) {
    throw new Error("HackPSUProvider: `config.apiBaseUrl` is required.");
  }

  return {
    ...config,
    authServiceUrl: stripTrailingSlashes(
      config.authServiceUrl ?? DEFAULT_AUTH_SERVICE_URL,
    ),
    minimumRole: config.minimumRole ?? Role.NONE,
    redirectMode: config.redirectMode ?? "immediate",
    showLoadingScreen: config.showLoadingScreen ?? true,
    loadingTimeout: config.loadingTimeout ?? 8000,
    posthog: config.posthog ?? true,
  };
}
