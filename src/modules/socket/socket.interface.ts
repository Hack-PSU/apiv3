import { IsString } from "class-validator";

export class MobilePingBody {
  @IsString()
  userId: string;

  @IsString()
  token: string;
}

export class AdminPingBody {
  @IsString()
  userId: string;
}
