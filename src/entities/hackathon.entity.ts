import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import Objection from "objection";

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
        from: "hackathon.id",
        to: "users.hackathonId",
      },
    },
  },
})
export class Hackathon extends Entity {
  @ID({ type: "string" })
  id: string;

  @Column({ type: "string" })
  name: string;

  @Column({ type: "integer" })
  startTime: number;

  @Column({ type: "integer" })
  endTime: number;

  @Column({ type: "boolean" })
  active: boolean;

  $parseDatabaseJson(json: Objection.Pojo): Objection.Pojo {
    json = super.$parseDatabaseJson(json);

    return {
      ...json,
      // map database active field to boolean
      active: json.active === 1,
    };
  }
}
