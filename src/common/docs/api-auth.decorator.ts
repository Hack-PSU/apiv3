import { applyDecorators } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOAuth2,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ExceptionResponse } from "./exception-response.entity";

import { Role } from "common/gcp";

export const ApiAuth = (privilege: Role, restricted = false) => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOAuth2([Role[privilege]]),
    ApiUnauthorizedResponse({
      description: "Unauthorized",
      type: ExceptionResponse,
    }),
    ...(restricted
      ? [
          ApiForbiddenResponse({
            description: "Forbidden",
            type: ExceptionResponse,
          }),
        ]
      : []),
  );
};
