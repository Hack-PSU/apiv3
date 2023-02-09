import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";

@Table({
  name: "projects",
  relationMappings: {
    scores: {
      relation: Entity.HasManyRelation,
      modelClass: "score.entity.js",
      join: {
        from: "projects.id",
        to: "scores.projectId",
      },
    },
  },
})
export class Project extends Entity {
  @ApiProperty()
  @ID({ type: "integer" })
  id: number;

  @ApiProperty()
  @Column({ type: "string" })
  name: string;

  @ApiProperty()
  @Column({ type: "string", required: false })
  hackathonId: string;
}

export class ProjectEntity extends PickType(Project, [
  "id",
  "name",
  "hackathonId",
] as const) {}
