import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import Objection from "objection";
import { ApiProperty, OmitType, PickType } from "@nestjs/swagger";

@Table({
  name: "hackathons",
  relationMappings: {
    scores: {
      relation: Entity.HasManyRelation,
      modelClass: "score.entity.js",
      join: {
        from: "hackathons.id",
        to: "scores.hackathonId",
      },
    },
    events: {
      relation: Entity.HasManyRelation,
      modelClass: "event.entity.js",
      join: {
        from: "hackathons.id",
        to: "events.hackathonId",
      },
    },
    projects: {
      relation: Entity.HasManyRelation,
      modelClass: "project.entity.js",
      join: {
        from: "hackathons.id",
        to: "projects.hackathonId",
      },
    },
    users: {
      relation: Entity.HasManyRelation,
      modelClass: "user.entity.js",
      join: {
        from: "hackathons.id",
        to: "users.hackathonId",
      },
    },
    sponsors: {
      relation: Entity.HasManyRelation,
      modelClass: "sponsor.entity.js",
      join: {
        from: "hackathons.id",
        to: "sponsors.hackathonId",
      },
    },
  },
})
export class Hackathon extends Entity {
  @ApiProperty()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @Column({ type: "string" })
  name: string;

  @ApiProperty()
  @Column({ type: "integer" })
  startTime: number;

  @ApiProperty()
  @Column({ type: "integer" })
  endTime: number;

  @ApiProperty()
  @Column({ type: "boolean" })
  active: boolean;

  $parseDatabaseJson(json: Objection.Pojo): Objection.Pojo {
    json = super.$parseDatabaseJson(json);

    return {
      ...json,
      // map database active field to boolean
      ...(json.active !== undefined ? { active: json.active === 1 } : {}),
    };
  }
}

export class HackathonEntity extends PickType(Hackathon, [
  "id",
  "name",
  "startTime",
  "endTime",
  "active",
] as const) {}
