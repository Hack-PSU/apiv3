import { ApiProperty, OmitType } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { SocketRoom } from "common/socket";

export class FlagEntity {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsBoolean()
  isEnabled: boolean;
}

export class ActivateFlagBody extends OmitType(FlagEntity, [
  "isEnabled",
] as const) {
  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(SocketRoom)
  broadcast?: SocketRoom;
}

export class PatchFlagsBody {
  @ApiProperty()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FlagEntity)
  flags: FlagEntity[];
}
