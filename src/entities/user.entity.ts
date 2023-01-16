import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";

@Table({
  name: "users",
  hackathonId: "hackathonId",
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

  @Column({ type: "boolean" })
  travelReimbursement: boolean;

  @Column({ type: "boolean" })
  driving: boolean;

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

  @Column({ type: "boolean" })
  eighteenBeforeEvent: boolean;

  @Column({ type: "boolean" })
  mlhCoc: boolean;

  @Column({ type: "boolean" })
  mlhDcp: boolean;

  @Column({ type: "string", required: false, nullable: true })
  referral?: string;

  @Column({ type: "string", required: false, nullable: true })
  project?: string;

  @Column({ type: "string", required: false, nullable: true })
  expectations?: string;

  @Column({ type: "boolean", required: false, nullable: true })
  shareAddressMlh?: boolean;

  @Column({ type: "boolean", required: false, nullable: true })
  shareAddressSponsors?: boolean;

  @Column({ type: "boolean", required: false, nullable: true })
  shareEmailMlh?: boolean;

  @Column({ type: "string" })
  pin: string;

  @Column({ type: "string" })
  veteran: string;

  @Column({ type: "string" })
  hackathonId: string;

  @Column({ type: "integer" })
  time: number;
}
