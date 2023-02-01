import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { PickType } from "@nestjs/swagger";

@Table({
  name: "sponsors",
})
export class Sponsor extends Entity {
  @ID({ type: "integer" })
  id: number;

  @Column({ type: "string" })
  name: string;

  @Column({ type: "string" })
  level: string;

  @Column({ type: "string" })
  link?: string;

  @Column({ type: "string" })
  logo?: string;

  @Column({ type: "integer" })
  order: number;

  @Column({ type: "string" })
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
