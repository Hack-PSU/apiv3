import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";

@Table({
  name: "projects",
  hackathonId: "hackathonId",
})
export class Project extends Entity {
  @ID({ type: "integer" })
  id: number;

  @Column({ type: "string" })
  name: string;

  @Column({ type: "string" })
  hackathonId: string;
}
