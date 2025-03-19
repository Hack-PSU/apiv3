import { Column, ID, Table } from "common/objection";
import { Entity } from "@entities/base.entity";
import Objection, { raw } from "objection";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { ControllerMethod } from "common/validation";
import { Expose } from "class-transformer";

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
    agg: async (qb) =>
      qb.select(
        "scores.*",
        raw("creativity + technical + implementation + clarity + growth").as(
          "total",
        ),
      ),
    scoresByOrganizer: async (qb, id: string) => qb.where("judgeId", id),
  },
})
export class Score extends Entity {
  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer", required: false })
  creativity: number;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer", required: false })
  technical: number;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer", required: false })
  implementation: number;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer", required: false })
  clarity: number;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer", required: false })
  growth: number;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer", required: false })
  challenge1: number;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer", required: false })
  challenge2: number;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer", required: false })
  challenge3: number;

  @ApiProperty({ required: false, default: "Current Hackathon" })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false })
  hackathonId: string;

  @ID({ type: "string" })
  @ApiProperty()
  @IsString()
  @Expose({ groups: [ControllerMethod.POST] })
  judgeId: string;

  @ID({ type: "integer" })
  @ApiProperty()
  @IsNumber()
  @Expose({ groups: [ControllerMethod.POST] })
  projectId: number;

  @ApiProperty()
  @IsBoolean()
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
  "creativity",
  "technical",
  "implementation",
  "clarity",
  "growth",
  "challenge1",
  "challenge2",
  "challenge3",
  "hackathonId",
  "judgeId",
  "projectId",
  "submitted",
] as const) {}
