import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional } from "class-validator";
import { RegistrationEntity } from "entities/registration.entity";

export class RegistrationWithScoreDto extends RegistrationEntity {
  @ApiProperty({ required: false, nullable: true, description: "Applicant score mu" })
  @IsOptional()
  @IsNumber()
  mu?: number;

  @ApiProperty({ required: false, nullable: true, description: "Applicant score sigma squared" })
  @IsOptional()
  @IsNumber()
  sigmaSquared?: number;

  @ApiProperty({ required: false, nullable: true, description: "Whether the applicant is prioritized" })
  @IsOptional()
  @IsBoolean()
  prioritized?: boolean;
}