import { ApiProperty, PickType } from "@nestjs/swagger";
import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { IsBoolean, IsNumber, IsString } from "class-validator";
import { Hackathon } from "./hackathon.entity";
import { User } from "./user.entity";

@Table({
  name: "applicant_scores",
  relationMappings: {
    hackathon: {
      relation: Entity.BelongsToOneRelation,
      modelClass: Hackathon,
      join: {
        from: "applicant_scores.hackathonId",
        to: "hackathons.id",
      },
    },
    user: {
      relation: Entity.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: "applicant_scores.userId",
        to: "users.id",
      },
    },
  },
})
export class ApplicantScore extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  @Column({ type: "string" })
  hackathonId: string;

  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  @Column({ type: "string" })
  userId: string;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "number" })
  mu: number;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "number" })
  sigmaSquared: number;

  @ApiProperty()
  @IsBoolean()
  @Column({ type: "boolean" })
  prioritized: boolean;
}

export class ApplicantScoreEntity extends PickType(ApplicantScore, [
  "hackathonId",
  "userId",
  "mu",
  "sigmaSquared",
  "prioritized",
] as const) {}