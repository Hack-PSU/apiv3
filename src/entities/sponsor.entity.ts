import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { Type } from "class-transformer";

@Table({
  name: "sponsors",
})
export class Sponsor extends Entity {
  @ApiProperty()
  @ID({ type: "integer" })
  id: number;

  @ApiProperty()
  @Column({ type: "string" })
  name: string;

  @ApiProperty()
  @Column({ type: "string" })
  level: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  link?: string;

  @ApiProperty({
    type: "string",
    format: "binary",
    required: false,
    nullable: true,
  })
  @Column({ type: "string", required: false, nullable: true })
  logo?: string;

  @ApiProperty()
  @Type(() => Number)
  @Column({ type: "integer" })
  order: number;

  @ApiProperty({ required: false })
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
