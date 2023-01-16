import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FirebaseAuthService } from "./firebase-auth.service";
import { Reflector } from "@nestjs/core";
import { FirebaseAuthRoles } from "common/firebase/auth/firebase-auth.constants";

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

    // rolesList is an array of Role values from the @Roles decorator
    const rolesList = this.reflector.get(
      FirebaseAuthRoles,
      context.getHandler(),
    );

    // Must call super.canActivate first to inject user into request and run
    // passport auth logic
    const passportAccess = await super.canActivate(context);

    if (passportAccess && rolesList) {
      if (context.getType() === "ws") {
        // WS User is not injected into request so FirebaseAuthService will
        // decode the token to find for permissions
        const token = context.switchToWs().getClient().handshake
          .headers.authorization;
        const bearerToken = token.split("Bearer ")[0];
        return this.authService.validateWsUser(bearerToken, rolesList);
      } else {
        const user = context.switchToHttp().getRequest().user;
        return this.authService.validateHttpUser(user, rolesList);
      }
    }

    return !!passportAccess;
  }
}
