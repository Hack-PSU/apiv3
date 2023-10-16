import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { Role } from "common/gcp";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { Expose } from "class-transformer";
import { ControllerMethod } from "common/validation";

@Table({
  name: "organizers",
  disableByHackathon: true,
  relationMappings: {
    scans: {
      relation: Entity.HasManyRelation,
      modelClass: "scan.entity.js",
      join: {
        from: "organizers.id",
        to: "scans.organizerId",
      },
    },
    scores: {
      relation: Entity.HasManyRelation,
      modelClass: "score.entity.js",
      join: {
        from: "organizers.id",
        to: "scores.judgeId",
      },
    },
    projects: {
      relation: Entity.ManyToManyRelation,
      modelClass: "project.entity.js",
      join: {
        from: "organizers.id",
        through: {
          modelClass: "score.entity.js",
          from: "scores.judgeId",
          to: "scores.projectId",
        },
        to: "projects.id",
      },
    },
  },
})
export class Organizer extends Entity {
  @ApiProperty()
  @Expose({ groups: [ControllerMethod.POST] })
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  firstName: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @Column({ type: "string" })
  email: string;

  @ApiProperty({
    type: "number",
    description:
      "An organizer's permission level: 0 (NONE), 1 (Volunteer), 2 (Team), 3 (Exec), 4 (Tech Director)",
  })
  @IsEnum(Role)
  privilege: Role;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  award?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  judgingLocation?: string;
}

export class OrganizerEntity extends PickType(Organizer, [
  "id",
  "firstName",
  "lastName",
  "email",
  "privilege",
  "award",
  "judgingLocation",
] as const) {}
