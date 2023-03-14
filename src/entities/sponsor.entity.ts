import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, IsUrl } from "class-validator";
import { ControllerMethod } from "common/validation";

@Table({
  name: "sponsors",
})
export class Sponsor extends Entity {
  @ApiProperty()
  @IsNumber()
  @Expose({ groups: [ControllerMethod.BATCH] })
  @ID({ type: "integer" })
  id: number;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  name: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  level: string;

  @ApiProperty({ required: false, nullable: true })
  @IsUrl()
  @Column({ type: "string", required: false, nullable: true })
  link?: string;

  @ApiProperty()
  @IsUrl()
  @Column({ type: "string", required: false, nullable: true })
  logo?: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  @Column({ type: "integer" })
  order: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false })
  hackathonId: string;
}

export class SponsorEntity extends PickType(Sponsor, [
  "id",
  "hackathonId",
  "logo",
  "link",
  "order",
  "level",
  "name",
] as const) {}
