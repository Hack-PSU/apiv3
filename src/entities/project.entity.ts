import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl } from "class-validator";
import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";

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
    team: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "team.entity.js",
      join: {
        from: "projects.teamId",
        to: "teams.id",
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

  @ApiProperty({
    required: false,
    description: "Team associated with this project",
  })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false })
  teamId?: string;

  @ApiProperty({ required: false, description: "Devpost submission link" })
  @IsOptional()
  @IsUrl({}, { message: "Must be a valid URL" })
  @Column({ type: "string", required: false })
  devpostLink?: string;
}

export class ProjectEntity extends PickType(Project, [
  "id",
  "name",
  "hackathonId",
  "categories",
  "teamId",
  "devpostLink",
] as const) {}
