import { IsEnum } from "class-validator";
import { Role } from "common/gcp";

export class AdminPingBody {
  @IsEnum(Role)
  role: Role;
}
