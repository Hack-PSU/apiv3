import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";

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
      filter: (qb) => qb.select("users.id"),
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
  @ApiProperty()
  @ID({ type: "integer" })
  id: number;

  @ApiProperty()
  @Column({ type: "string" })
  name: string;

  @ApiProperty()
  @Column({ type : "string", required: false })
  hackathonId: string;
}

export class ExtraCreditClassEntity extends PickType(ExtraCreditClass, [
  "id",
  "name",
  "hackathonId",
] as const) {}
