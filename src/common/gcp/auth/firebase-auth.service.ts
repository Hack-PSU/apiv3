import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import {
  FirebaseAuthJWTKeySets,
  RestrictedEndpointPredicate,
} from "common/gcp/auth";
import { Role } from "./firebase-auth.types";
import jwtDecode, { JwtPayload } from "jwt-decode";
import * as admin from "firebase-admin";

type FirebaseJwtPayload = JwtPayload & { privilege?: number };

type ValidateFn = (user: any, role: Role) => boolean;

type ValidateCmp = (role: Role) => boolean;

@Injectable()
export class FirebaseAuthService {
  constructor(private readonly httpService: HttpService) {}

  private decodeToken(token: string) {
    return jwtDecode(token) as FirebaseJwtPayload;
  }

  private validateAccess(user: any, access?: Role[], fn?: ValidateCmp) {
    if (!access) {
      return true;
    }
    return access.every(
      fn ??
        ((role) => {
          if (role === Role.NONE && !user.privilege) {
            return true;
          } else {
            return user.privilege && user.privilege >= role;
          }
        }),
    );
  }

  extractAuthToken(token: string) {
    if (token.startsWith("Bearer")) {
      return token.replace("Bearer ", "");
    }
    return token;
  }

  getJWTKeys() {
    return this.httpService.get(FirebaseAuthJWTKeySets);
  }

  validateHttpUser(user: any, access?: Role[]) {
    return this.validateAccess(user, access);
  }

  intersectRoles(user: any, access?: Role[], fn?: ValidateFn) {
    return this.validateAccess(user, access, (role) => fn(user, role));
  }

  // Only use for HTTP
  validateRestrictedAccess(
    request: any,
    predicate?: RestrictedEndpointPredicate,
    access?: Role[],
  ): boolean | undefined {
    if (!access || !predicate) {
      // unable to determine access
      return undefined;
    }

    const user = request.user;

    // check for intersecting roles
    if (user && user.privilege && !access.includes(user.privilege)) {
      return undefined;
    }

    return predicate(request);
  }

  validateWsUser(token: string, access?: Role[]): boolean {
    const decodedToken = this.decodeToken(this.extractAuthToken(token));
    if (decodedToken) {
      return this.validateAccess(decodedToken, access);
    }
    return false;
  }

  async validateUser(uid: string): Promise<boolean> {
    return !!(await admin.auth().getUser(uid));
  }

  async getUserPrivilege(uid: string): Promise<number> {
    try {
      if (await this.validateUser(uid)) {
        const user = await admin.auth().getUser(uid);
        return user.customClaims.privilege;  
      } else {
        return 0;
      }
    } catch (e) {
      console.error(e);
      return 2;
    }
  }

  updateUserClaims(uid: string, privilege: Role) {
    return admin.auth().setCustomUserClaims(uid, { privilege });
  }
}
