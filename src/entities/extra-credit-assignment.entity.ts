import { ID, Table } from "common/objection";
import { Entity } from "@entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";

@Table({
  name: "extraCreditAssignments",
  disableByHackathon: true,
})
export class ExtraCreditAssignment extends Entity {
  @ID({ type: "string" })
  @ApiProperty()
  userId: string;

  @ID({ type: "integer" })
  @ApiProperty()
  classId: number;
}

export class ExtraCreditAssignmentEntity extends PickType(
  ExtraCreditAssignment,
  ["userId", "classId"] as const,
) {}
