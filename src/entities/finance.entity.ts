import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsString, IsOptional, IsUrl } from "class-validator";
import { Entity } from "entities/base.entity";
import { ID, Column, Table } from "common/objection";

export enum Status {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum SubmitterType {
  USER = "USER",
  ORGANIZER = "ORGANIZER",
}

@Table({
  name: "finances",
  relationMappings: {
    users: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "user.entity.js",
      join: {
        from: "finances.submitterId",
        to: "users.id",
      },
    },
    organizers: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "organizer.entity.js",
      join: {
        from: "finances.submitterId",
        to: "organizers.id",
      },
    },
    hackathons: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "hackathon.entity.js",
      join: {
        from: "finances.hackathonId",
        to: "hackathons.id",
      },
    },
  },
})
export class Finance extends Entity {
  @ApiProperty({
    description: "Unique identifier for the finance record",
    example: "a1b2c3d4-e5f6-7890-abcd-1234567890ef",
  })
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty({
    description: "Amount to be reimbursed",
    example: 150.75,
  })
  @IsNumber(
    {
      maxDecimalPlaces: 2,
    },
    { each: true },
  )
  @Column({ type: "number" })
  amount: number;

  @ApiProperty({
    description: "Status of the reimbursement request",
    enum: Status,
    example: Status.PENDING,
  })
  @IsEnum(Status)
  @Column({ type: "string" })
  status: Status;

  @ApiProperty({
    description: "Type of the submitter (USER or ORGANIZER)",
    enum: SubmitterType,
    example: SubmitterType.USER,
  })
  @IsEnum(SubmitterType)
  @Column({ type: "string" })
  submitterType: SubmitterType;

  @ApiProperty({
    description: "ID of the submitter (User or Organizer)",
    example: "user123",
  })
  @IsString()
  @Column({ type: "string" })
  submitterId: string;

  @ApiProperty({
    description: "URL to the uploaded receipt",
    example: "https://s3.amazonaws.com/bucket/receipts/a1b2c3d4.pdf",
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsUrl()
  @Column({ type: "string", nullable: true })
  receiptUrl?: string;

  @ApiProperty({
    description: "ID of the related hackathon",
    example: "hack789",
  })
  @IsString()
  @Column({ type: "string" })
  hackathonId: string;

  @ApiProperty({
    description: "Description of the expense",
    example: "Travel expenses for attending the hackathon",
  })
  @IsString()
  @Column({ type: "string" })
  description: string;

  // This needs to be an Enum
  @ApiProperty({
    description: "Category of the expense",
    example: "Travel",
  })
  @IsString()
  @Column({ type: "string" })
  category: string;

  @ApiProperty({
    description: "Timestamp when the record was created in milliseconds",
    example: 1620000000000,
  })
  @IsNumber()
  @Column({ type: "integer" })
  createdAt: number;

  @ApiProperty({
    description: "ID of the user who last updated the record",
    example: "user123",
    required: false,
  })
  @IsString()
  @IsOptional()
  @Column({ type: "string", nullable: true })
  updatedBy?: string;
}

export class FinanceEntity extends PickType(Finance, [
  "id",
  "amount",
  "status",
  "submitterType",
  "submitterId",
  "receiptUrl",
  "hackathonId",
  "description",
  "category",
  "createdAt",
  "updatedBy",
] as const) {}
