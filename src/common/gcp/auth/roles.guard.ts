import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FirebaseAuthService } from "./firebase-auth.service";
import { Reflector } from "@nestjs/core";
import {
  FirebaseAuthRestrictedEndpoint,
  FirebaseAuthRestrictedRoles,
  FirebaseAuthRoles,
} from "./firebase-auth.constants";
import {
  RestrictedEndpointHandler,
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

    // Must call super.canActivate first to inject user into request and run
    // passport auth logic
    const passportAccess = await super.canActivate(context);

    if (!passportAccess) {
      return false;
    }

    // rolesList is an array of Role values from the @Roles decorator
    const rolesList = this.reflector.get(
      FirebaseAuthRoles,
      context.getHandler(),
    );

    // object will be built based on provided route metadata
    let restricted: RestrictedRolesOptions | undefined;

    // handler is the provided extraction function from the @RestrictedEndpoint
    // decorator
    const handler: RestrictedEndpointHandler | undefined = this.reflector.get(
      FirebaseAuthRestrictedEndpoint,
      context.getHandler(),
    );

    if (handler) {
      restricted = {
        handler,
        roles: rolesList ?? [],
      };
    }

    // restrictedRoles is the options provided under the @RestrictedRoles
    // decorator (will override handler if exists)
    const restrictedRoles: RestrictedRolesOptions | undefined =
      this.reflector.get(FirebaseAuthRestrictedRoles, context.getHandler());

    if (restrictedRoles) {
      restricted.roles = restrictedRoles.roles;
      restricted.handler = restrictedRoles.handler;
    }

    // if no authorization required default to passportAccess
    if (!restrictedRoles && !handler && !rolesList) {
      return !!passportAccess;
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

      let restrictedAccess = true;

      // if any route is defined as restricted
      if (restricted) {
        restrictedAccess = this.authService.validateRestrictedAccess(
          request,
          restricted.handler,
          restricted.roles,
        );
      }

      const generalAccess = this.authService.validateHttpUser(
        request.user,
        rolesList,
      );

      return restrictedAccess || generalAccess;
    }
  }
}
