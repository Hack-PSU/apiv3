import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

@Table({
  name: "challenges",
})
export class Challenge extends Entity {
  @ApiProperty()
  @IsNumber()
  @ID({ type: "integer" })
  id: number;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  @Column({ type: "string" })
  name: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  description: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Column({ type: "string", required: false, nullable: true })
  firstPrize?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Column({ type: "string", required: false, nullable: true })
  secondPrize?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Column({ type: "string", required: false, nullable: true })
  thirdPrize?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false })
  hackathonId: string;
}

export class ChallengeEntity extends PickType(Challenge, [
  "id",
  "hackathonId",
  "name",
  "description",
  "firstPrize",
  "secondPrize",
  "thirdPrize",
] as const) {}
