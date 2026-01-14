import { Entity } from "entities/base.entity";
import { Column, ID, Table } from "common/objection";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { RegistrationGrade } from "entities/registration.entity";

@Table({
  name: "registration_reviews",
})
export class RegistrationReview extends Entity {
  @ApiProperty()
  @ID({ type: "number" })
  id: number;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer" })
  registrationId: number;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  reviewerId: string;

  @ApiProperty({ enum: RegistrationGrade })
  @IsEnum(RegistrationGrade)
  @Column({ type: "string" })
  grade: RegistrationGrade;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  reviewNotes?: string;
  
  @ApiProperty()
  @Column({ type: "number" }) 
  createdAt: number;
}