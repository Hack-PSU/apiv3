import { Role } from "common/gcp";
import { applyDecorators } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOAuth2,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ExceptionResponse } from "./exception-response.entity";

export const ApiAuth = (privilege: Role) => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOAuth2([privilege.toString()]),
    ApiUnauthorizedResponse({
      description: "Unauthorized",
      type: ExceptionResponse,
    }),
  );
};
