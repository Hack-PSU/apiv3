import { Entity } from "entities/base.entity";
import { Column, ID, Table } from "common/objection";
import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";

@Table({
  name: "reviewer_stats",
})
export class ReviewerStats extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  reviewerId: string;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer" })
  totalReviewed: number;
}