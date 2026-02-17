import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNumber, IsString, ValidateNested } from "class-validator";

export class ApplicantScoreDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  hackathonId: string;

  @ApiProperty()
  @IsNumber()
  mu: number;

  @ApiProperty()
  @IsNumber()
  sigmaSquared: number;

  @ApiProperty()
  @IsBoolean()
  prioritized: boolean;
}

export class BulkApplicantScoreDto {
  @ApiProperty({ type: [ApplicantScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicantScoreDto)
  scores: ApplicantScoreDto[];
}