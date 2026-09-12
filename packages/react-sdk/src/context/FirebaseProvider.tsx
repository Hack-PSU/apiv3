"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { signOut, type Auth, type User } from "firebase/auth";
import { configureApiClient } from "@hackpsu/api-client";
import { getFirebaseAuth } from "../firebase";
import {
  captureSessionToken,
  clearSessionToken,
  withSessionAuth,
} from "../session-token";
import { resolveConfig, type HackPSUConfig, type ResolvedHackPSUConfig } from "../config";

export type FirebaseContextType = {
  auth: Auth;
  config: ResolvedHackPSUConfig;
  isLoading: boolean;
  isAuthenticated: boolean;
  user?: User;
  /** The custom token returned by the auth service. Not the API bearer token. */
  token?: string;
  error?: string;
  /** Current Firebase ID token: this is what the API authorizes against. */
  getIdToken(): Promise<string | null>;
  verifySession(): Promise<void>;
  logout(): Promise<void>;
};

const FirebaseContext = createContext<FirebaseContextType | null>(null);

type Props = { children: ReactNode; config: HackPSUConfig };

export const FirebaseProvider: FC<Props> = ({ children, config: rawConfig }) => {
  const config = useMemo(() => resolveConfig(rawConfig), [rawConfig]);
  const auth = useMemo(() => getFirebaseAuth(config.firebase), [config.firebase]);

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [hasInitialized, setHasInitialized] = useState(false);
  const isLoggingOut = useRef(false);

  const getIdToken = useCallback(async () => {
    const current = auth.currentUser;
    return current ? current.getIdToken() : null;
  }, [auth]);

  // Point the generated API client at this app's API and auth. Runs before the
  // first render commits so no hook can fire a request against an unconfigured
  // client.
  useMemo(() => {
    configureApiClient({
      baseUrl: config.apiBaseUrl,
      getToken: () => (auth.currentUser ? auth.currentUser.getIdToken() : null),
      onUnauthorized: () => {
        if (typeof window === "undefined" || isLoggingOut.current) return;
        const returnTo = encodeURIComponent(window.location.href);
        window.location.href = `${config.authServiceUrl}/login?returnTo=${returnTo}`;
      },
    });
  }, [auth, config.apiBaseUrl, config.authServiceUrl]);

  const identify = useCallback(
    async (signedIn: User) => {
      if (!config.posthog) return;
      try {
        const posthog = (await import("posthog-js")).default;
        posthog.identify(signedIn.uid, { email: signedIn.email ?? undefined });
      } catch {
        // PostHog is optional; never block sign-in on analytics.
      }
    },
    [config.posthog],
  );

  const verifySession = useCallback(async () => {
    if (isLoggingOut.current) return;

    // On localhost and Vercel previews the auth cookie is unreadable, so the
    // auth service hands back a token in the redirect instead. Pick it up
    // before asking about the session.
    captureSessionToken();

    try {
      const response = await fetch(`${config.authServiceUrl}/api/sessionUser`, {
        method: "GET",
        credentials: "include",
        headers: withSessionAuth({ "Content-Type": "application/json" }),
      });

      if (response.status === 401) {
        if (typeof window !== "undefined") {
          const returnTo = encodeURIComponent(window.location.href);
          window.location.href = `${config.authServiceUrl}/login?returnTo=${returnTo}`;
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`Session verification failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data?.customToken) {
        throw new Error("No custom token received from auth service");
      }

      const { signInWithCustomToken } = await import("firebase/auth");
      const credential = await signInWithCustomToken(auth, data.customToken);

      setUser(credential.user);
      setToken(data.customToken);
      setError(undefined);
      void identify(credential.user);
    } catch (err) {
      setUser(null);
      setToken(undefined);
      setError(err instanceof Error ? err.message : "Session verification failed");
      throw err;
    }
  }, [auth, config.authServiceUrl, identify]);

  useEffect(() => {
    if (hasInitialized || isLoggingOut.current) return;

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        await Promise.race([
          verifySession(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Session check timeout")), 5000),
          ),
        ]);
      } catch {
        // Stay on the page for the initial check; AuthGuard decides whether to
        // redirect. Only an explicit verifySession() call redirects on 401.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setHasInitialized(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [verifySession, hasInitialized]);

  const logout = useCallback(async () => {
    isLoggingOut.current = true;
    setError(undefined);
    setIsLoading(true);

    try {
      if (config.posthog) {
        try {
          const posthog = (await import("posthog-js")).default;
          posthog.reset();
        } catch {
          // ignore
        }
      }

      await fetch(`${config.authServiceUrl}/api/sessionLogout`, {
        method: "POST",
        credentials: "include",
        headers: withSessionAuth({ "Content-Type": "application/json" }),
      });

      clearSessionToken();

      await signOut(auth);
      setUser(null);
      setToken(undefined);
    } catch (e: any) {
      setError(e?.message ?? "Logout failed");
      throw e;
    } finally {
      setIsLoading(false);
      isLoggingOut.current = false;
    }
  }, [auth, config.authServiceUrl, config.posthog]);

  const value = useMemo<FirebaseContextType>(
    () => ({
      auth,
      config,
      isLoading,
      isAuthenticated: !!user && !isLoggingOut.current,
      user: user ?? undefined,
      token,
      error,
      getIdToken,
      verifySession,
      logout,
    }),
    [auth, config, isLoading, user, token, error, getIdToken, verifySession, logout],
  );

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
};

export const useFirebase = () => {
  const ctx = useContext(FirebaseContext);
  if (!ctx) throw new Error("useFirebase must be used within a HackPSUProvider");
  return ctx;
};
