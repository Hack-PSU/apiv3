import { jwtDecode } from "jwt-decode";
import { Role } from "./config";

/**
 * Reads the HackPSU privilege level out of a Firebase token.
 *
 * Two token shapes reach this function and they nest claims differently:
 *   - ID tokens (what the API authorizes against) carry custom claims at the
 *     top level: `{ production: 2, ... }`.
 *   - Custom tokens (what the auth service returns) nest them: `{ claims: { production: 2 } }`.
 *
 * Both are accepted so the client's view of a user's role matches the API's
 * (`FirebaseAuthService.extractUserPrivilege`) regardless of which token is held.
 */
export function getRole(token: string | undefined | null): Role {
  if (!token) return Role.NONE;

  try {
    const decoded = jwtDecode<Record<string, any>>(token);
    const claims = decoded?.claims ?? decoded;
    const role = claims?.production ?? claims?.staging ?? Role.NONE;
    return typeof role === "number" ? role : Role.NONE;
  } catch {
    return Role.NONE;
  }
}

export const ROLE_NAMES: Record<Role, string> = {
  [Role.NONE]: "None",
  [Role.VOLUNTEER]: "Volunteer",
  [Role.TEAM]: "Team Member",
  [Role.EXEC]: "Executive",
  [Role.TECH]: "Tech Team",
  [Role.FINANCE]: "Finance",
};
