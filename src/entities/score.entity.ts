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
  @Column({ type: "integer", required: false })
  creativity: number;

  @ApiProperty()
  @Column({ type: "integer", required: false })
  technical: number;

  @ApiProperty()
  @Column({ type: "integer", required: false })
  implementation: number;

  @ApiProperty()
  @Column({ type: "integer", required: false })
  clarity: number;

  @ApiProperty()
  @Column({ type: "integer", required: false })
  growth: number;

  @ApiProperty()
  @Column({ type: "integer", required: false })
  energy: number;

  @ApiProperty()
  @Column({ type: "integer", required: false })
  supplyChain: number;

  @ApiProperty()
  @Column({ type: "integer", required: false })
  environmental: number;

  @ApiProperty({ required: false, default: "Current Hackathon" })
  @Column({ type: "string", required: false })
  hackathonId: string;

  @ApiProperty()
  @Column({ type: "string" })
  judgeId: string;

  @ApiProperty()
  @Column({ type: "integer" })
  projectId: number;

  @ApiProperty()
  @Column({ type: "boolean", required: false })
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
