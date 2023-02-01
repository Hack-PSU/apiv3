import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { PickType } from "@nestjs/swagger";

@Table({
  name: "locations",
  disableByHackathon: true,
})
export class Location extends Entity {
  @ID({ type: "integer" })
  id: number;

  @Column({ type: "string" })
  name: string;
}

export class LocationEntity extends PickType(Location, [
  "id",
  "name",
] as const) {}
