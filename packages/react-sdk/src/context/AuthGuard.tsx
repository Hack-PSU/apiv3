"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useFirebase } from "./FirebaseProvider";
import { getRole, ROLE_NAMES } from "../roles";
import { Role } from "../config";

type AuthState = "checking" | "authenticated" | "unauthenticated" | "unauthorized";

export interface AuthGuardProps {
  children: ReactNode;
  /**
   * Minimum role for this subtree, overriding the provider's. Lets an app leave
   * most routes public and gate only some of them, which is why it is separate
   * from the provider-level default.
   */
  minimumRole?: Role;
  /** Rendered while the session is being verified. */
  loadingFallback?: ReactNode;
  /** Rendered when the user is signed in but lacks the minimum role. */
  unauthorizedFallback?: ReactNode;
}

const MAX_RETRIES = 3;

function Centered({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div>{children}</div>
    </div>
  );
}

/**
 * Gates its children on an authenticated session that meets `minimumRole`.
 *
 * Policy is unchanged from the original implementation: verify the SSO session,
 * retry a stalled check up to three times, then redirect to the auth service.
 * Styling uses inline styles rather than Tailwind classes so the guard renders
 * correctly in apps that do not ship Tailwind.
 */
export function AuthGuard({
  children,
  minimumRole,
  loadingFallback,
  unauthorizedFallback,
}: AuthGuardProps) {
  const { user, isLoading, token, verifySession, config } = useFirebase();
  const requiredRole = minimumRole ?? config.minimumRole;
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [retryCount, setRetryCount] = useState(0);
  const hasRedirected = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const redirectToAuth = useCallback(() => {
    if (hasRedirected.current || typeof window === "undefined") return;
    hasRedirected.current = true;

    const authUrl = new URL(`${config.authServiceUrl}/login`);
    authUrl.searchParams.set("returnTo", window.location.href);

    if (config.redirectMode === "immediate") {
      window.location.href = authUrl.toString();
    }
  }, [config.authServiceUrl, config.redirectMode]);

  const retryVerification = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) {
      redirectToAuth();
      return;
    }
    setRetryCount((prev) => prev + 1);
    try {
      await verifySession();
    } catch {
      // Surfaced through context error state; the retry counter drives the redirect.
    }
  }, [retryCount, redirectToAuth, verifySession]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let redirectId: ReturnType<typeof setTimeout> | undefined;

    if (isLoading) {
      if (config.loadingTimeout) {
        timeoutId = setTimeout(() => {
          if (mounted.current) void retryVerification();
        }, config.loadingTimeout);
      }
    } else if (user) {
      const authorized =
        requiredRole === Role.NONE || getRole(token) >= requiredRole;
      setAuthState(authorized ? "authenticated" : "unauthorized");
    } else {
      setAuthState("unauthenticated");
      redirectId = setTimeout(() => {
        if (mounted.current) redirectToAuth();
      }, 1000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (redirectId) clearTimeout(redirectId);
    };
  }, [
    isLoading,
    user,
    token,
    config.loadingTimeout,
    requiredRole,
    retryVerification,
    redirectToAuth,
  ]);

  if (authState === "authenticated") {
    return <>{children}</>;
  }

  if (authState === "unauthorized") {
    if (unauthorizedFallback) return <>{unauthorizedFallback}</>;

    const userRole = getRole(token);
    return (
      <Centered>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Access Denied</h1>
        <p>You don&apos;t have sufficient permissions to access this application.</p>
        <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
          Your role: {ROLE_NAMES[userRole] ?? "Unknown"} / Required:{" "}
          {ROLE_NAMES[requiredRole]}
          {user?.email ? ` / Signed in as ${user.email}` : ""}
        </p>
        <button
          onClick={() => {
            hasRedirected.current = false;
            redirectToAuth();
          }}
          style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}
        >
          Try a different account
        </button>
      </Centered>
    );
  }

  if (authState === "unauthenticated" && config.redirectMode === "manual") {
    return (
      <Centered>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Sign In Required</h1>
        <p>Please sign in to continue.</p>
        <button
          onClick={() => {
            hasRedirected.current = false;
            redirectToAuth();
          }}
          style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}
        >
          Continue to sign in
        </button>
      </Centered>
    );
  }

  if (!config.showLoadingScreen) return null;
  if (loadingFallback) return <>{loadingFallback}</>;

  return (
    <Centered>
      <p>Verifying authentication...</p>
    </Centered>
  );
}
