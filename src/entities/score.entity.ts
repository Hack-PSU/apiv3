import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import Objection from "objection";
import { PickType } from "@nestjs/swagger";

@Table({
  name: "scores",
  relationMappings: {
    project: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "project.entity.js",
      filter: (qb) => qb.select("id", "name"),
      join: {
        from: "scores.projectId",
        to: "projects.id",
      },
    },
    judge: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "organizer.entity.js",
      join: {
        from: "scores.judgeId",
        to: "organizers.id",
      },
    },
  },
})
export class Score extends Entity {
  @ID({ type: "integer" })
  id: number;

  @Column({ type: "integer" })
  creativity: number;

  @Column({ type: "integer" })
  technical: number;

  @Column({ type: "integer" })
  implementation: number;

  @Column({ type: "integer" })
  clarity: number;

  @Column({ type: "integer" })
  growth: number;

  @Column({ type: "integer" })
  energy: number;

  @Column({ type: "integer" })
  supplyChain: number;

  @Column({ type: "integer" })
  environmental: number;

  @Column({ type: "string" })
  hackathonId: string;

  @Column({ type: "string" })
  judgeId: string;

  @Column({ type: "integer" })
  projectId: number;

  @Column({ type: "boolean" })
  submitted: boolean;

  $parseDatabaseJson(json: Objection.Pojo): Objection.Pojo {
    json = super.$parseDatabaseJson(json);

    return {
      ...json,
      // map database submitted field to boolean
      submitted: json.submitted === 1,
    };
  }

  $formatJson(json: Objection.Pojo): Objection.Pojo {
    delete json.hackathonId;
    delete json.projectId;
    delete json.judgeId;

    return json;
  }
}

export class ScoreEntity extends PickType(Score, [
  "id",
  "creativity",
  "technical",
  "implementation",
  "clarity",
  "growth",
  "energy",
  "supplyChain",
  "environmental",
  "hackathonId",
  "judgeId",
  "projectId",
  "submitted",
] as const) {}
