import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import { jwtDecode, JwtPayload } from "jwt-decode";

import {
  FirebaseAuthJWTKeySets,
  RestrictedEndpointPredicate,
} from "common/gcp/auth";
import { Role } from "./firebase-auth.types";

enum AuthEnvironment {
  PROD = "production",
  STAGING = "staging",
}

type FirebaseJwtPayload = JwtPayload & {
  production?: number;
  staging?: number;
};
type ValidateFn = (user: any, role: Role) => boolean;
type ValidateCmp = (role: Role) => boolean;

@Injectable()
export class FirebaseAuthService {
  private authEnvironment: AuthEnvironment;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const authEnv = configService.get<AuthEnvironment>("AUTH_ENVIRONMENT");
    if (!Object.values(AuthEnvironment).includes(authEnv)) {
      throw Error(`Unrecognized AUTH_ENVIRONMENT: ${authEnv}`);
    }
    this.authEnvironment = authEnv;
  }

  private decodeToken(token: string): FirebaseJwtPayload {
    return jwtDecode(token) as FirebaseJwtPayload;
  }

  private validateAccess(
    user: any,
    access?: Role[],
    fn?: ValidateCmp,
  ): boolean {
    // If no access roles exist, then the route does not require authorization.
    if (!access) {
      return true;
    }

    const privilege = this.extractUserPrivilege(user);

    // Check that validation function passes for every role.
    return access.every(
      fn ??
        // Default validation function: check that role is either 'NONE' or privilege >= role.
        ((role) => {
          if (role === Role.NONE) {
            return true;
          } else {
            return privilege && privilege >= role;
          }
        }),
    );
  }

  // Extracts Firebase idtoken from the provided Bearer token by removing the 'Bearer' text if present.
  extractAuthToken(token: string): string {
    return token.startsWith("Bearer") ? token.replace("Bearer ", "") : token;
  }

  getJWTKeys() {
    return this.httpService.get(FirebaseAuthJWTKeySets);
  }

  validateHttpUser(user: any, access?: Role[]): boolean {
    return this.validateAccess(user, access);
  }

  intersectRoles(user: any, access?: Role[], fn?: ValidateFn): boolean {
    return this.validateAccess(user, access, (role) => fn(user, role));
  }

  // Only used for HTTP requests.
  async validateRestrictedAccess(
    request: any,
    predicate?: RestrictedEndpointPredicate,
    access?: Role[],
  ): Promise<boolean> {
    if (!access || !predicate) {
      // No predicated restrictions exist on this route, so block the request.
      return false;
    }

    // Block the request if the user doesn't meet any of the predicated roles.
    if (!access.includes(await this.getUserPrivilegeFromRequest(request))) {
      return false;
    }

    // Roles are a potential match, so check the predicate to determine access.
    return predicate(request);
  }

  validateWsUser(token: string, access?: Role[]): boolean {
    const decodedToken = this.decodeToken(this.extractAuthToken(token));
    if (!decodedToken) {
      // Block the request if the decode process fails.
      return false;
    }

    return this.validateAccess(decodedToken, access);
  }

  async validateUser(uid: string): Promise<boolean> {
    return !!(await admin.auth().getUser(uid));
  }

  // Extract the user privilege from an HTTP Request.
  async getUserPrivilegeFromRequest(request: any): Promise<number> {
    return request.user ? this.extractUserPrivilege(request.user) : Role.NONE;
  }

  // Extract the user privilege from a decoded auth token or possibly other sources that fit the format.
  extractUserPrivilege(user: any): number {
    return user[this.authEnvironment] ?? Role.NONE;
  }

  // Look up a user's privilege in Firebase by their uid.
  async getUserPrivilegeFromUid(uid: string): Promise<number> {
    try {
      if (await this.validateUser(uid)) {
        const user = await admin.auth().getUser(uid);
        return user.customClaims[this.authEnvironment];
      } else {
        return Role.NONE;
      }
    } catch (e) {
      console.error(e);
      return Role.NONE;
    }
  }

  // Update a user's Firebase custom claims to include the given privilege level.
  async updateUserPrivilege(uid: string, privilege: Role): Promise<void> {
    const privileges = (await admin.auth().getUser(uid)).customClaims ?? {};
    privileges[this.authEnvironment] = privilege;
    await admin.auth().setCustomUserClaims(uid, privileges);
  }

  // Create a new user in Firebase with the given privilege level.
  async createUserWithPrivilege(
    email: string,
    password: string,
    privilege: Role,
  ): Promise<string> {
    const user = await admin.auth().createUser({
      email,
      password,
    });

    await this.updateUserPrivilege(user.uid, privilege);

    return user.uid;
  }

  async getUserByEmail(email: string): Promise<any> {
    return admin.auth().getUserByEmail(email);
  }

  async generatePasswordResetLink(email: string): Promise<string> {
    return admin.auth().generatePasswordResetLink(email);
  }

  // Delete a user from Firebase.
  async deleteUser(uid: string): Promise<void> {
    await admin.auth().deleteUser(uid);
  }
}
