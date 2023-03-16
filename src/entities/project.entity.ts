import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { raw } from "objection";
import { IsOptional, IsString } from "class-validator";

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
  modifiers: {
    scoreAvg: async (qb) =>
      qb
        .select("projects.*", raw("AVG(scores.total)").as("average"))
        .groupBy(
          "projects.id",
          "scores.id",
          "scores.projectId",
          "scores.judgeId",
        ),
  },
})
export class Project extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "integer" })
  id: number;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  name: string;

  @ApiProperty({ required: false, description: "Defaults to active hackathon" })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false })
  hackathonId: string;
}

export class ProjectEntity extends PickType(Project, [
  "id",
  "name",
  "hackathonId",
] as const) {}
