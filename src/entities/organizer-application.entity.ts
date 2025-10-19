import { ApiProperty, PickType } from "@nestjs/swagger";
import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { Expose } from "class-transformer";
import { ControllerMethod } from "common/validation";

export enum YearStanding {
  FRESHMAN = "Freshman",
  SOPHOMORE = "Sophomore",
  JUNIOR = "Junior",
  SENIOR = "Senior",
  OTHER = "Other",
}

export enum OrganizerTeam {
  COMMUNICATIONS = "Communications",
  DESIGN = "Design",
  EDUCATION = "Education",
  ENTERTAINMENT = "Entertainment",
  FINANCE = "Finance",
  LOGISTICS = "Logistics",
  MARKETING = "Marketing",
  SPONSORSHIP = "Sponsorship",
  TECHNOLOGY = "Technology",
}

export enum ApplicationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

@Table({
  name: "organizer_applications",
  disableByHackathon: true,
})
export class OrganizerApplication extends Entity {
  @ApiProperty()
  @Expose({ groups: [ControllerMethod.POST] })
  @IsNumber()
  @ID({ type: "number" })
  id: number;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  name: string;

  @ApiProperty()
  @IsEmail()
  @Column({ type: "string" })
  email: string;

  @ApiProperty({ enum: YearStanding })
  @IsEnum(YearStanding)
  @Column({ type: "string" })
  yearStanding: YearStanding;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  major: string;

  @ApiProperty({ enum: OrganizerTeam })
  @IsEnum(OrganizerTeam)
  @Column({ type: "string" })
  firstChoiceTeam: OrganizerTeam;

  @ApiProperty({ enum: OrganizerTeam })
  @IsEnum(OrganizerTeam)
  @Column({ type: "string" })
  secondChoiceTeam: OrganizerTeam;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  resumeUrl: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  whyHackpsu: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  newIdea: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  whatExcitesYou: string;

  @ApiProperty({
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
    required: false,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  @Column({ type: "string", required: false })
  firstChoiceStatus?: ApplicationStatus;

  @ApiProperty({
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
    required: false,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  @Column({ type: "string", required: false })
  secondChoiceStatus?: ApplicationStatus;

  @ApiProperty({ enum: OrganizerTeam, required: false, nullable: true })
  @IsOptional()
  @IsEnum(OrganizerTeam)
  @Column({ type: "string", required: false, nullable: true })
  assignedTeam?: OrganizerTeam;

  @ApiProperty({ required: false })
  @IsOptional()
  @Column({ type: "string", required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @Column({ type: "string", required: false })
  updatedAt?: Date;
}

export class OrganizerApplicationEntity extends PickType(OrganizerApplication, [
  "id",
  "name",
  "email",
  "yearStanding",
  "major",
  "firstChoiceTeam",
  "secondChoiceTeam",
  "resumeUrl",
  "whyHackpsu",
  "newIdea",
  "whatExcitesYou",
  "firstChoiceStatus",
  "secondChoiceStatus",
  "assignedTeam",
  "createdAt",
  "updatedAt",
] as const) {}
