import { SetMetadata } from "@nestjs/common";
import { FirebaseAuthRoles } from "./firebase-auth.constants";
import { Role } from "./firebase-auth.types";

export const Roles = (...access: Role[]) =>
  SetMetadata(FirebaseAuthRoles, access);
