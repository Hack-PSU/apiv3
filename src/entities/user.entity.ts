import { PickType } from "@nestjs/swagger";
import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { Type } from "class-transformer";

@Table({
  name: "users",
  hackathonId: "hackathonId",
  relationMappings: {
    extraCreditClasses: {
      relation: Entity.ManyToManyRelation,
      modelClass: "extra-credit-class.entity.js",
      join: {
        from: "users.id",
        through: {
          modelClass: "extra-credit-assignment.entity.js",
          from: "extraCreditAssignments.userId",
          to: "extraCreditAssignments.classId",
        },
        to: "extraCreditClasses.id",
      },
    },
  },
})
export class User extends Entity {
  @ID({ type: "string" })
  id: string;

  @Column({ type: "string" })
  firstName: string;

  @Column({ type: "string" })
  lastName: string;

  @Column({ type: "string" })
  gender: string;

  @Column({ type: "string" })
  shirtSize: string;

  @Column({ type: "string", required: false, nullable: true })
  dietaryRestriction?: string;

  @Column({ type: "string", required: false, nullable: true })
  allergies?: string;

  @Type(() => Boolean)
  @Column({ type: "boolean" })
  travelReimbursement: boolean;

  @Type(() => Boolean)
  @Column({ type: "boolean" })
  driving: boolean;

  @Type(() => Boolean)
  @Column({ type: "boolean" })
  firstHackathon: boolean;

  @Column({ type: "string" })
  university: string;

  @Column({ type: "string" })
  email: string;

  @Column({ type: "string" })
  academicYear: string;

  @Column({ type: "string" })
  educationalInstitutionType: string;

  @Column({ type: "string" })
  major: string;

  @Column({ type: "string" })
  phone: string;

  @Column({ type: "string" })
  address: string;

  @Column({ type: "string", required: false, nullable: true })
  race?: string;

  @Column({ type: "string", required: false, nullable: true })
  resume?: string;

  @Column({ type: "string", required: false, nullable: true })
  codingExperience?: string;

  @Type(() => Boolean)
  @Column({ type: "boolean" })
  eighteenBeforeEvent: boolean;

  @Type(() => Boolean)
  @Column({ type: "boolean" })
  mlhCoc: boolean;

  @Type(() => Boolean)
  @Column({ type: "boolean" })
  mlhDcp: boolean;

  @Column({ type: "string", required: false, nullable: true })
  referral?: string;

  @Column({ type: "string", required: false, nullable: true })
  project?: string;

  @Column({ type: "string", required: false, nullable: true })
  expectations?: string;

  @Type(() => Boolean)
  @Column({ type: "boolean", required: false, nullable: true })
  shareAddressMlh?: boolean;

  @Type(() => Boolean)
  @Column({ type: "boolean", required: false, nullable: true })
  shareAddressSponsors?: boolean;

  @Type(() => Boolean)
  @Column({ type: "boolean", required: false, nullable: true })
  shareEmailMlh?: boolean;

  @Column({ type: "string" })
  pin: string;

  @Column({ type: "string" })
  veteran: string;

  @Column({ type: "string" })
  hackathonId: string;

  @Type(() => Number)
  @Column({ type: "integer" })
  time: number;
}

export class UserEntity extends PickType(User, [
  "id",
  "firstName",
  "lastName",
  "gender",
  "shirtSize",
  "dietaryRestriction",
  "allergies",
  "travelReimbursement",
  "driving",
  "firstHackathon",
  "university",
  "email",
  "academicYear",
  "educationalInstitutionType",
  "major",
  "phone",
  "address",
  "race",
  "resume",
  "codingExperience",
  "eighteenBeforeEvent",
  "mlhCoc",
  "mlhDcp",
  "referral",
  "project",
  "expectations",
  "shareAddressMlh",
  "shareAddressSponsors",
  "shareEmailMlh",
  "veteran",
  "hackathonId",
  "time",
] as const) {}
