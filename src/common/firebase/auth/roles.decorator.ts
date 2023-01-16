import { SetMetadata } from "@nestjs/common";
import { FirebaseAuthRoles } from "./firebase-auth.constants";

export enum Role {
  NONE,
  VOLUNTEER,
  TEAM,
  EXEC,
  TECH,
  FINANCE,
}

export const Roles = (...access: Role[]) =>
  SetMetadata(FirebaseAuthRoles, access);
