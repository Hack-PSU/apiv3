import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import Objection, { raw } from "objection";
import { ApiProperty, PickType } from "@nestjs/swagger";

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
  modifiers: {
    agg: (qb) =>
      qb
        .select(
          "scores.*",
          raw(
            "SUM(creativity + technical + implementation + clarity + growth)",
          ).as("total"),
        )
        .groupBy("scores.id"),
  },
})
export class Score extends Entity {
  @ApiProperty()
  @ID({ type: "integer" })
  id: number;

  @ApiProperty()
  @Column({ type: "integer" })
  creativity: number;

  @ApiProperty()
  @Column({ type: "integer" })
  technical: number;

  @ApiProperty()
  @Column({ type: "integer" })
  implementation: number;

  @ApiProperty()
  @Column({ type: "integer" })
  clarity: number;

  @ApiProperty()
  @Column({ type: "integer" })
  growth: number;

  @ApiProperty()
  @Column({ type: "integer" })
  energy: number;

  @ApiProperty()
  @Column({ type: "integer" })
  supplyChain: number;

  @ApiProperty()
  @Column({ type: "integer" })
  environmental: number;

  @ApiProperty()
  @Column({ type: "string" })
  hackathonId: string;

  @ApiProperty()
  @Column({ type: "string" })
  judgeId: string;

  @ApiProperty()
  @Column({ type: "integer" })
  projectId: number;

  @ApiProperty()
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
