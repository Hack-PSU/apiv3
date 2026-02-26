import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export enum Requirements {
  CHECK_IN = "check-in",
  SUBMIT = "submit",
  EXPO = "expo",
  OTHER = "other",
}
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
      filter: (qb) =>
        qb.select("users.id", "users.firstName", "users.lastName"),
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

  @ApiProperty({ enum: Requirements, default: Requirements.CHECK_IN })
  @IsEnum(Requirements)
  @Column({ type: "string", nullable: true, required: false })
  requirement: Requirements = Requirements.CHECK_IN;
}

export class ExtraCreditClassEntity extends PickType(ExtraCreditClass, [
  "id",
  "name",
  "hackathonId",
  "requirement",
] as const) {}
