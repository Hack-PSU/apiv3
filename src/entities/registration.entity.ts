import { Entity } from "entities/base.entity";
import { Column, ID, Table } from "common/objection";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import Objection from "objection";
import { Hackathon } from "entities/hackathon.entity";


export enum ApplicationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  WAITLISTED = "waitlisted",
  CONFIRMED = "confirmed",
  DECLINED = "declined",
}


@Table({
  name: "registrations",
  modifiers: {
    active: (qb) =>
      qb.where(
        "hackathonId",
        Hackathon.query().select("id").where("active", true),
      ),
  },
})
export class Registration extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "number" })
  id: number;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  userId: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @Column({ type: "boolean" })
  travelReimbursement = false;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @Column({ type: "boolean" })
  driving = false;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @Column({ type: "boolean" })
  firstHackathon = false;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  academicYear: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  educationalInstitutionType: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  codingExperience: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Column({ type: "number" })
  age: number;

  @ApiProperty()
  @IsBoolean()
  @Type(() => Boolean)
  @Column({ type: "boolean" })
  mlhCoc: boolean;

  @ApiProperty()
  @IsBoolean()
  @Type(() => Boolean)
  @Column({ type: "boolean" })
  mlhDcp: boolean;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  referral: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  project: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  expectations: string;

  @ApiProperty({
    type: "boolean",
    required: false,
    nullable: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @Column({ type: "boolean", required: false, nullable: true })
  shareAddressMlh?: boolean = false;

  @ApiProperty({
    type: "boolean",
    required: false,
    nullable: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @Column({ type: "boolean", required: false, nullable: true })
  shareAddressSponsors?: boolean = false;

  @ApiProperty({
    type: "boolean",
    required: false,
    nullable: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @Column({ type: "boolean", required: false, nullable: true })
  shareEmailMlh?: boolean = false;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  veteran: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false })
  hackathonId: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  @Column({ type: "integer" })
  time: number;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  excitement: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  zipCode?: string;

  @ApiProperty({ type: "number", required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Column({ type: "number", required: false, nullable: true })
  travelCost?: number;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  travelMethod?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  travelAdditional?: string;

  @ApiProperty({ enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  @IsEnum(ApplicationStatus)
  @Column({ type: "string" })
  applicationStatus: ApplicationStatus = ApplicationStatus.PENDING;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @Column({ type: "integer", required: false, nullable: true })
  acceptedAt?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @Column({ type: "integer", required: false, nullable: true })
  rsvpDeadline?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @Column({ type: "integer", required: false, nullable: true })
  rsvpAt?: number;
  
  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  acceptedBy?: string;
  
  private parseBoolean(name: string, field?: number) {
    return field !== undefined ? { [name]: field === 1 } : {};
  }

  $parseDatabaseJson(json: Objection.Pojo): Objection.Pojo {
    json = super.$parseDatabaseJson(json);

    return {
      ...json,
      ...this.parseBoolean("travelReimbursement", json.travelReimbursement),
      ...this.parseBoolean("driving", json.driving),
      ...this.parseBoolean("age", json.age),
      ...this.parseBoolean("mlhCoc", json.mlhCoc),
      ...this.parseBoolean("mlhDcp", json.mlhDcp),
      ...this.parseBoolean("shareAddressMlh", json.shareAddressMlh),
      ...this.parseBoolean("shareAddressSponsors", json.shareAddressSponsors),
      ...this.parseBoolean("shareEmailMlh", json.shareEmailMlh),
      ...this.parseBoolean("firstHackathon", json.firstHackathon),
    };
  }
}

export class RegistrationEntity extends PickType(Registration, [
  "id",
  "userId",
  "age",
  "shareAddressSponsors",
  "travelReimbursement",
  "shareAddressMlh",
  "educationalInstitutionType",
  "academicYear",
  "codingExperience",
  "expectations",
  "driving",
  "hackathonId",
  "firstHackathon",
  "mlhCoc",
  "mlhDcp",
  "project",
  "referral",
  "shareEmailMlh",
  "time",
  "veteran",
  "excitement",
  "zipCode",
  "travelCost",
  "travelMethod",
  "travelAdditional",
  "applicationStatus",
  "acceptedAt",
  "rsvpDeadline",
  "rsvpAt",
  "acceptedBy",
] as const) {}
