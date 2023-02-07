import { Role } from "common/gcp";
import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiOAuth2 } from "@nestjs/swagger";

export const ApiAuth = (privilege: Role) => {
  return applyDecorators(ApiBearerAuth(), ApiOAuth2([privilege.toString()]));
};
