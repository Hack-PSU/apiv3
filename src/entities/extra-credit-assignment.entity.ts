import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";

@Table({
  name: "extraCreditAssignments",
})
export class ExtraCreditAssignment extends Entity {
  @ApiProperty()
  @ID({ type: "integer" })
  id: number;

  @ApiProperty()
  @Column({ type: "string" })
  userId: string;

  @ApiProperty()
  @Column({ type: "integer" })
  classId: number;

  @ApiProperty()
  @Column({ type: "string", required: false })
  hackathonId: string;
}

export class ExtraCreditAssignmentEntity extends PickType(
  ExtraCreditAssignment,
  ["id", "userId", "classId"] as const,
) {}
