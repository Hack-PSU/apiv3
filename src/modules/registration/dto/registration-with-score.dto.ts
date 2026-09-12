import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { RegistrationEntity } from "entities/registration.entity";

export class RegistrationWithScoreDto extends RegistrationEntity {
  @ApiProperty({
    required: false,
    nullable: true,
    description: "Applicant score mu",
  })
  @IsOptional()
  @IsNumber()
  mu?: number;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Applicant score sigma squared",
  })
  @IsOptional()
  @IsNumber()
  sigmaSquared?: number;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Whether the applicant is prioritized",
  })
  @IsOptional()
  @IsBoolean()
  prioritized?: boolean;

  // Both score endpoints join the user table and select these, so they are
  // part of the response even though they live on User rather than Registration.
  @ApiProperty({ description: "Applicant's first name, joined from the user" })
  @IsString()
  firstName: string;

  @ApiProperty({ description: "Applicant's last name, joined from the user" })
  @IsString()
  lastName: string;
}
