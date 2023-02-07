import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { PickType } from "@nestjs/swagger";

@Table({
  name: "extraCreditAssignments",
})
export class ExtraCreditAssignment extends Entity {
  @ID({ type: "integer" })
  id: number;

  @Column({ type: "string" })
  userId: string;

  @Column({ type: "integer" })
  classId: number;
}

export class ExtraCreditAssignmentEntity extends PickType(
  ExtraCreditAssignment,
  ["id", "userId", "classId"] as const,
) {}
