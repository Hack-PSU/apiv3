import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FirebaseAuthService } from "./firebase-auth.service";
import { Reflector } from "@nestjs/core";
import {
  FirebaseAuthRestrictedEndpoint,
  FirebaseAuthRestrictedRoles,
  FirebaseAuthRoles,
} from "./firebase-auth.constants";
import {
  RestrictedEndpointPredicate,
  RestrictedRolesOptions,
} from "./restricted-roles.decorator";

@Injectable()
export class RolesGuard extends AuthGuard("jwt") {
  constructor(
    private readonly authService: FirebaseAuthService,
    private readonly reflector: Reflector,
  ) {
    super();
  }

  getRequest(context: ExecutionContext) {
    // When validating jwt token, FirebaseAuthStrategy will reference this
    // method to resolve the request and look up the headers
    if (context.getType() === "ws") {
      const ws = context.switchToWs().getClient();
      return {
        headers: {
          authorization: ws.handshake.headers.authorization,
        },
      };
    } else if (context.getType() === "http") {
      return context.switchToHttp().getRequest();
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // canActivate is called last and will check user against permissions

    console.log("calling canActivate.");

    // rolesList is an array of Role values from the @Roles decorator
    const rolesList = this.reflector.get(
      FirebaseAuthRoles,
      context.getHandler(),
    );

    if (rolesList) {
      rolesList.forEach((element) => {
        console.log(`role: ${element}`);
      });
    }

    // object will be built based on provided route metadata
    let restricted: RestrictedRolesOptions | undefined;

    // handler is the provided extraction function from the @RestrictedEndpoint
    // decorator
    const predicate: RestrictedEndpointPredicate | undefined =
      this.reflector.get(FirebaseAuthRestrictedEndpoint, context.getHandler());

    if (predicate) {
      restricted = {
        roles: rolesList ?? [],
        predicate,
      };
    }

    // restrictedRoles is the options provided under the @RestrictedRoles
    // decorator (will override handler if exists)
    const restrictedRoles: RestrictedRolesOptions | undefined =
      this.reflector.get(FirebaseAuthRestrictedRoles, context.getHandler());

    if (restrictedRoles) {
      restricted = {
        roles: restrictedRoles.roles,
        predicate: restrictedRoles.predicate,
      };
    }

    // if no authorization required default to passportAccess
    if (!restrictedRoles && !predicate && !rolesList) {
      return true;
    }

    // Must call super.canActivate to inject user into request and run passport auth logic
    console.log("calling super canActivate.");
    console.log(`context type: ${context.getType()}`);
    const passportAccess = await super.canActivate(context);

    if (!passportAccess) {
      console.log("no passport access.");
      return false;
    }

    if (context.getType() === "ws") {
      // WS User is not injected into request so FirebaseAuthService will
      // decode the token to find for permissions
      const token = context.switchToWs().getClient().handshake
        .headers.authorization;
      return this.authService.validateWsUser(token, rolesList);
    } else if (context.getType() === "http") {
      // HTTP requests are checked against possible restricted roles
      const request = context.switchToHttp().getRequest();

      // if any route is defined as restricted
      if (restricted) {
        // isAllowed === undefined if user is not a part of restriction
        // or not enough information to determine authorization
        const isAllowed = this.authService.validateRestrictedAccess(
          request,
          restricted.predicate,
          restricted.roles,
        );

        if (isAllowed !== undefined) return isAllowed;
      }

      return this.authService.validateHttpUser(request.user, rolesList);
    }
  }
}
