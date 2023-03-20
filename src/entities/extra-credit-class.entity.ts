import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

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
  @IsNumber()
  @ID({ type: "integer" })
  id: number;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Column({ type: "string", nullable: true, required: false })
  hackathonId: string;
}

export class ExtraCreditClassEntity extends PickType(ExtraCreditClass, [
  "id",
  "name",
  "hackathonId",
] as const) {}
