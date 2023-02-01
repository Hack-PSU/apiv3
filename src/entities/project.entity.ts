import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { PickType } from "@nestjs/swagger";

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

export class ProjectEntity extends PickType(Project, [
  "id",
  "name",
  "hackathonId",
] as const) {}
