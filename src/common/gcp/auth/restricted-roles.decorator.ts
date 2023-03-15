import { Role } from "common/gcp";
import { SetMetadata } from "@nestjs/common";
import {
  FirebaseAuthRestrictedEndpoint,
  FirebaseAuthRestrictedRoles,
} from "common/gcp/auth/firebase-auth.constants";

export type RestrictedEndpointPredicate = (request: any) => boolean;

export type RestrictedRolesOptions = {
  predicate: RestrictedEndpointPredicate;
  roles: Role[];
};

/**
 * Decorate endpoint to enforce all provided roles according to the handler.
 * The decorator will enforce a matching user id using the handler and the provided
 * token.
 * @param predicate
 * @constructor
 */
export const RestrictedEndpoint = (predicate: RestrictedEndpointPredicate) =>
  SetMetadata(FirebaseAuthRestrictedEndpoint, predicate);

/**
 * RestrictedRoles imply a restricted endpoint. Roles that intersect with the
 * roles defined using @Roles decorator, will favor the restricted policy.
 * @param options
 * @constructor
 */
export const RestrictedRoles = (options: RestrictedRolesOptions) =>
  SetMetadata(FirebaseAuthRestrictedRoles, options);
