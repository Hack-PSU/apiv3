import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { FirebaseAuthJWTKeySets } from "common/firebase/auth/firebase-auth.constants";
import { Role } from "common/firebase/auth/roles.decorator";
import jwtDecode, { JwtPayload } from "jwt-decode";

type FirebaseJwtPayload = JwtPayload & { privilege?: number };

@Injectable()
export class FirebaseAuthService {
  constructor(private readonly httpService: HttpService) {}

  getJWTKeys() {
    return this.httpService.get(FirebaseAuthJWTKeySets);
  }

  validateHttpUser(user: any, access: Role[]) {
    return access.every((role) => user.privilege && user.privilege >= role);
  }

  validateWsUser(token: string, access: Role[]) {
    const decodedToken = jwtDecode(token) as FirebaseJwtPayload;
    if (decodedToken) {
      return access.every(
        (role) => decodedToken.privilege && decodedToken.privilege >= role,
      );
    }
    return false;
  }
}
