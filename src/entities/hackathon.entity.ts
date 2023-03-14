import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import Objection from "objection";
import { ApiProperty, OmitType, PickType } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsString } from "class-validator";

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
    scans: {
      relation: Entity.HasManyRelation,
      modelClass: "scan.entity.js",
      join: {
        from: "hackathons.id",
        to: "scans.hackathonId",
      },
    },
    extraCreditClasses: {
      relation: Entity.HasManyRelation,
      modelClass: "extra-credit-class.entity.js",
      join: {
        from: "hackathon.id",
        to: "extraCreditClasses.hackathonId",
      },
    },
    extraCreditAssignments: {
      relation: Entity.HasManyRelation,
      modelClass: "extra-credit-assignment.entity.js",
      join: {
        from: "hackathons.id",
        through: {
          modelClass: "extra-credit-class.entity.js",
          from: "extraCreditClasses.hackathonId",
          to: "extraCreditClasses.id",
        },
        to: "extraCreditAssignments.classId",
      },
    },
    registrations: {
      relation: Entity.HasManyRelation,
      modelClass: "registration.entity.js",
      join: {
        from: "hackathons.id",
        to: "registrations.hackathonId",
      },
    },
    extraCreditClasses: {
      relation: Entity.HasManyRelation,
      modelClass: "extra-credit-class.entity.js",
      join: {
        from: "hackathons.id",
        to: "extraCreditClass.hackathonId",
      },
    },
  },
})
export class Hackathon extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  name: string;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer" })
  startTime: number;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer" })
  endTime: number;

  @ApiProperty()
  @IsBoolean()
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
