import { Role } from "common/gcp";
import { SetMetadata } from "@nestjs/common";
import { Request } from "express";
import {
  FirebaseAuthRestrictedEndpoint,
  FirebaseAuthRestrictedRoles,
} from "common/gcp/auth/firebase-auth.constants";

export type RestrictedEndpointHandler = (req: Request) => string;

export type RestrictedRolesOptions = {
  handler: RestrictedEndpointHandler;
  roles: Role[];
};

/**
 * Decorate endpoint to enforce all provided roles according to the handler.
 * The decorator will enforce a matching user id using the handler and the provided
 * token.
 * @param handler
 * @constructor
 */
export const RestrictedEndpoint = (handler: RestrictedEndpointHandler) =>
  SetMetadata(FirebaseAuthRestrictedEndpoint, handler);

/**
 * RestrictedRoles imply a restricted endpoint. Roles that intersect with the
 * roles defined using @Roles decorator, will favor the restricted policy.
 * @param options
 * @constructor
 */
export const RestrictedRoles = (options: RestrictedRolesOptions) =>
  SetMetadata(FirebaseAuthRestrictedRoles, options);
