import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";

@Table({
  name: "locations",
})
export class Location extends Entity {
  @ID({ type: "integer" })
  id: number;

  @Column({ type: "string" })
  name: string;
}
