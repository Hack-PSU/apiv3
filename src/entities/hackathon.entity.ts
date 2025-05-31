import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import Objection from "objection";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsString } from "class-validator";
import { Score } from "./score.entity";
import { Event } from "./event.entity";
import { Project } from "./project.entity";
import { User } from "./user.entity";
import { Sponsor } from "./sponsor.entity";
import { Scan } from "./scan.entity";

@Table({
  name: "hackathons",
  relationMappings: {
    scores: {
      relation: Entity.HasManyRelation,
      modelClass: Score,
      join: {
        from: "hackathons.id",
        to: "scores.hackathonId",
      },
    },
    events: {
      relation: Entity.HasManyRelation,
      modelClass: Event,
      join: {
        from: "hackathons.id",
        to: Event.tableName + ".hackathonId",
      },
    },
    projects: {
      relation: Entity.HasManyRelation,
      modelClass: Project,
      join: {
        from: "hackathons.id",
        to: "projects.hackathonId",
      },
    },
    users: {
      relation: Entity.ManyToManyRelation,
      modelClass: User,
      join: {
        from: "hackathons.id",
        through: {
          modelClass: "registration.entity.js",
          from: "registrations.hackathonId",
          to: "registrations.userId",
        },
        to: "users.id",
      },
    },
    sponsors: {
      relation: Entity.HasManyRelation,
      modelClass: Sponsor,
      join: {
        from: "hackathons.id",
        to: "sponsors.hackathonId",
      },
    },
    scans: {
      relation: Entity.HasManyRelation,
      modelClass: Scan,
      join: {
        from: "hackathons.id",
        to: "scans.hackathonId",
      },
    },
    extraCreditClasses: {
      relation: Entity.HasManyRelation,
      modelClass: "extra-credit-class.entity.js",
      join: {
        from: "hackathons.id",
        to: "extraCreditClasses.hackathonId",
      },
    },
    extraCreditAssignments: {
      relation: Entity.ManyToManyRelation,
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
    finances: {
      relation: Entity.HasManyRelation,
      modelClass: "finance.entity.js",
      join: {
        from: "hackathons.id",
        to: "finances.hackathonId",
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
