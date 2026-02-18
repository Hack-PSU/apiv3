import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { ApplicationStatus } from "entities/registration.entity";

export class UpdateStatusDto {
  @ApiProperty({ enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}