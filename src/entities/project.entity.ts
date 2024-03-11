import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
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
    projectsByHackathon: async (qb, id) =>
      qb.where("projects.hackathon_id", id),
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

  @ApiProperty({ required: false, description: "Categories" })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false })
  categories: string;
}

export class ProjectEntity extends PickType(Project, [
  "id",
  "name",
  "hackathonId",
  "categories",
] as const) {}
