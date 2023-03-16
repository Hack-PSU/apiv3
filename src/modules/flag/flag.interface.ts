import { ApiProperty, OmitType } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

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
}

export class PatchFlagsBody {
  @ApiProperty()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FlagEntity)
  flags: FlagEntity[];
}
