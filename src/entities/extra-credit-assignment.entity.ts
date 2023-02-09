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
}

export class ExtraCreditAssignmentEntity extends PickType(
  ExtraCreditAssignment,
  ["id", "userId", "classId"] as const,
) {}
