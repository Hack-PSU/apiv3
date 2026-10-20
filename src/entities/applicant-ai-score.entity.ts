import { ApiProperty } from "@nestjs/swagger";
import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";

export enum ApplicantAiScoreStatus {
  SCORED = "scored",
  FAILED = "failed",
}

@Table({
  name: "applicant_ai_scores",
  disableByHackathon: true,
})
export class ApplicantAiScore extends Entity {
  @ApiProperty()
  @ID({ type: "string" })
  @Column({ type: "string" })
  hackathonId: string;

  @ApiProperty()
  @ID({ type: "string" })
  @Column({ type: "string" })
  userId: string;

  @ApiProperty({ enum: ApplicantAiScoreStatus })
  @Column({ type: "string" })
  status: ApplicantAiScoreStatus;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: "number", required: false, nullable: true })
  score?: number;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: "integer", required: false, nullable: true })
  effortScore?: number;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: "integer", required: false, nullable: true })
  motivationScore?: number;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: "integer", required: false, nullable: true })
  projectScore?: number;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: "integer", required: false, nullable: true })
  initiativeScore?: number;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  summary?: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  model?: string;

  @ApiProperty()
  @Column({ type: "string" })
  promptVersion: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  error?: string;

  @ApiProperty()
  @Column({ type: "integer" })
  attempts: number;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: "integer", required: false, nullable: true })
  scoredAt?: number;

  @ApiProperty()
  @Column({ type: "integer" })
  updatedAt: number;
}
