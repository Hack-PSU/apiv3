import { ApiProperty, PickType } from "@nestjs/swagger";
import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { Type } from "class-transformer";
import Objection from "objection";

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
  @ApiProperty()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @Column({ type: "string" })
  firstName: string;

  @ApiProperty()
  @Column({ type: "string" })
  lastName: string;

  @ApiProperty()
  @Column({ type: "string" })
  gender: string;

  @ApiProperty()
  @Column({ type: "string" })
  shirtSize: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  dietaryRestriction?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  allergies?: string;

  @ApiProperty()
  @Type(() => Boolean)
  @Column({ type: "boolean" })
  travelReimbursement: boolean;

  @ApiProperty()
  @Type(() => Boolean)
  @Column({ type: "boolean" })
  driving: boolean;

  @ApiProperty()
  @Type(() => Boolean)
  @Column({ type: "boolean" })
  firstHackathon: boolean;

  @ApiProperty()
  @Column({ type: "string" })
  university: string;

  @ApiProperty()
  @Column({ type: "string" })
  email: string;

  @ApiProperty()
  @Column({ type: "string" })
  academicYear: string;

  @ApiProperty()
  @Column({ type: "string" })
  educationalInstitutionType: string;

  @ApiProperty()
  @Column({ type: "string" })
  major: string;

  @ApiProperty()
  @Column({ type: "string" })
  phone: string;

  @ApiProperty()
  @Column({ type: "string" })
  address: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  race?: string;

  @ApiProperty({ type: "string", nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  resume?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  codingExperience?: string;

  @ApiProperty()
  @Type(() => Boolean)
  @Column({ type: "boolean" })
  eighteenBeforeEvent: boolean;

  @ApiProperty()
  @Type(() => Boolean)
  @Column({ type: "boolean" })
  mlhCoc: boolean;

  @ApiProperty()
  @Type(() => Boolean)
  @Column({ type: "boolean" })
  mlhDcp: boolean;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  referral?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  project?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  expectations?: string;

  @ApiProperty({ type: "boolean", required: false, nullable: true })
  @Type(() => Boolean)
  @Column({ type: "boolean", required: false, nullable: true })
  shareAddressMlh?: boolean;

  @ApiProperty({ type: "boolean", required: false, nullable: true })
  @Type(() => Boolean)
  @Column({ type: "boolean", required: false, nullable: true })
  shareAddressSponsors?: boolean;

  @ApiProperty({ type: "boolean", required: false, nullable: true })
  @Type(() => Boolean)
  @Column({ type: "boolean", required: false, nullable: true })
  shareEmailMlh?: boolean;

  @ApiProperty()
  @Column({ type: "string" })
  veteran: string;

  @ApiProperty()
  @Column({ type: "string", required: false })
  hackathonId: string;

  @ApiProperty()
  @Type(() => Number)
  @Column({ type: "integer" })
  time: number;

  private parseBoolean(name: string, field?: number) {
    return field !== undefined ? { [name]: field === 1 } : {};
  }

  $parseDatabaseJson(json: Objection.Pojo): Objection.Pojo {
    json = super.$parseDatabaseJson(json);

    return {
      ...json,
      ...this.parseBoolean("travelReimbursement", json.travelReimbursement),
      ...this.parseBoolean("driving", json.driving),
      ...this.parseBoolean("eighteenBeforeEvent", json.eighteenBeforeEvent),
      ...this.parseBoolean("mlhCoc", json.mlhCoc),
      ...this.parseBoolean("mlhDcp", json.mlhDcp),
      ...this.parseBoolean("shareAddressMlh", json.shareAddressMlh),
      ...this.parseBoolean("shareAddressSponsors", json.shareAddressSponsors),
      ...this.parseBoolean("shareEmailMlh", json.shareEmailMlh),
    };
  }
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
