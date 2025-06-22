import { ApiProperty, PickType } from "@nestjs/swagger";
import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { IsEmail, IsOptional, IsString } from "class-validator";

@Table({
  name: "users",
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
    registrations: {
      relation: Entity.HasManyRelation,
      modelClass: "registration.entity.js",
      join: {
        from: "users.id",
        to: "registrations.userId",
      },
    },
  },
})
export class User extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  firstName: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  lastName: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  gender: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  shirtSize: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  dietaryRestriction?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  allergies?: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  university: string;

  @ApiProperty()
  @IsEmail()
  @Column({ type: "string" })
  email: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  major: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  phone: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  country: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  race?: string;

  @ApiProperty({ type: "string", nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  resume?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  linkedinUrl?: string;
}

export class UserEntity extends PickType(User, [
  "id",
  "firstName",
  "lastName",
  "gender",
  "shirtSize",
  "dietaryRestriction",
  "allergies",
  "university",
  "email",
  "major",
  "phone",
  "country",
  "race",
  "resume",
  "linkedinUrl"
] as const) {}
