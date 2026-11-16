"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FirebaseProvider } from "./FirebaseProvider";
import { AuthGuard } from "./AuthGuard";
import type { HackPSUConfig } from "../config";

export interface HackPSUProviderProps {
  children: ReactNode;
  config: HackPSUConfig;
  /** Supply your own QueryClient to share caches or change defaults. */
  queryClient?: QueryClient;
  /** Set false to handle authentication yourself. Defaults to true. */
  guard?: boolean;
  loadingFallback?: ReactNode;
  unauthorizedFallback?: ReactNode;
}

function createDefaultQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });
}

/**
 * Single entry point for a HackPSU frontend: Firebase auth, the SSO session,
 * React Query, and the generated API client, wired together.
 *
 * Config is passed in rather than read from `process.env` inside this package.
 * See `config.ts` for why that distinction matters.
 *
 * @example
 * // app/layout.tsx
 * <HackPSUProvider
 *   config={{
 *     firebase: { apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!, ... },
 *     apiBaseUrl: process.env.NEXT_PUBLIC_BASE_URL_V3!,
 *     minimumRole: Role.TEAM,
 *   }}
 * >
 *   {children}
 * </HackPSUProvider>
 */
export function HackPSUProvider({
  children,
  config,
  queryClient,
  guard = true,
  loadingFallback,
  unauthorizedFallback,
}: HackPSUProviderProps) {
  // Lazy state keeps one client per mount instead of one per module, which
  // would be shared across requests during SSR.
  const [fallbackClient] = useState(createDefaultQueryClient);
  const client = queryClient ?? fallbackClient;

  return (
    <FirebaseProvider config={config}>
      <QueryClientProvider client={client}>
        {guard ? (
          <AuthGuard
            loadingFallback={loadingFallback}
            unauthorizedFallback={unauthorizedFallback}
          >
            {children}
          </AuthGuard>
        ) : (
          children
        )}
      </QueryClientProvider>
    </FirebaseProvider>
  );
}

export default HackPSUProvider;
