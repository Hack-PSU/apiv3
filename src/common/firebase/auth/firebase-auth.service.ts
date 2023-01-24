import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { FirebaseAuthJWTKeySets } from "common/firebase/auth/firebase-auth.constants";
import { Role } from "./firebase-auth.types";
import jwtDecode, { JwtPayload } from "jwt-decode";
import * as admin from "firebase-admin";
import { Request } from "express";
import { RestrictedEndpointHandler } from "common/firebase";

type FirebaseJwtPayload = JwtPayload & { privilege?: number };

@Injectable()
export class FirebaseAuthService {
  constructor(private readonly httpService: HttpService) {}

  private decodeToken(token: string) {
    return jwtDecode(token) as FirebaseJwtPayload;
  }

  private validateAccess(user: any, access?: Role[]) {
    if (!access) {
      return true;
    }

    return access.every((role) => user.privilege && user.privilege >= role);
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

  // Only use for HTTP
  validateRestrictedAccess(
    request: any,
    handler?: RestrictedEndpointHandler,
    access?: Role[],
  ): boolean {
    if (!handler) {
      return true;
    }

    const resource = handler(request);
    const user = request.user;

    if (user && user.sub && resource !== user.sub) {
      return false;
    }

    if (!access) {
      return true;
    }

    return this.validateHttpUser(user, access);
  }

  validateHttpUser(user: any, access?: Role[]) {
    return this.validateAccess(user, access);
  }

  validateWsUser(token: string, access?: Role[]) {
    const decodedToken = this.decodeToken(token);
    if (decodedToken) {
      return this.validateAccess(decodedToken, access);
    }
    return false;
  }

  async validateUser(uid: string) {
    return !!(await admin.auth().getUser(uid));
  }

  async getUserPrivilege(uid: string) {
    try {
      const user = await admin.auth().getUser(uid);
      return user.customClaims.privilege;
    } catch (e) {
      console.error(e);
      return 2;
    }
  }

  updateUserClaims(uid: string, privilege: Role) {
    return admin.auth().setCustomUserClaims(uid, { privilege });
  }
}
