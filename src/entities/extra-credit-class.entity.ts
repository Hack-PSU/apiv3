import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { PickType } from "@nestjs/swagger";

@Table({
  name: "extraCreditClasses",
  relationMappings: {
    assignments: {
      relation: Entity.HasManyRelation,
      modelClass: "extra-credit-assignment.entity.js",
      join: {
        from: "extraCreditClasses.id",
        to: "extraCreditAssignments.classId",
      },
    },
    users: {
      relation: Entity.ManyToManyRelation,
      modelClass: "user.entity.js",
      filter: (qb) => qb.select("id"),
      join: {
        from: "extraCreditClasses.id",
        through: {
          modelClass: "extra-credit-assignment.entity.js",
          from: "extraCreditAssignments.classId",
          to: "extraCreditAssignments.userId",
        },
        to: "users.id",
      },
    },
  },
})
export class ExtraCreditClass extends Entity {
  @ID({ type: "integer" })
  id: number;

  @Column({ type: "string" })
  name: string;
}

export class ExtraCreditClassEntity extends PickType(ExtraCreditClass, [
  "id",
  "name",
] as const) {}
