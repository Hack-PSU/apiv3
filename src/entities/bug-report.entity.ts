import { ApiProperty, PickType } from "@nestjs/swagger";
import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";
import { Type } from "class-transformer";

export enum BugSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum BugStatus {
  UNSEEN = "unseen",
  IN_PROGRESS = "in progress",
  RESOLVED = "resolved",
}

@Table({
  name: "bug_reports",
})
export class BugReport extends Entity {
  @ApiProperty()
  @IsUUID()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  title: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  description?: string;

  @ApiProperty({ enum: BugSeverity })
  @IsEnum(BugSeverity)
  @Column({ type: "string" })
  severity: BugSeverity;

  @ApiProperty({ enum: BugStatus, required: false, default: BugStatus.UNSEEN })
  @IsOptional()
  @IsEnum(BugStatus)
  @Column({ type: "string", required: false })
  status: BugStatus;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  @Column({ type: "integer" })
  dateReported?: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  @Column({ type: "integer" })
  dateUpdated?: number;
}

export class BugReportEntity extends PickType(BugReport, [
  "id",
  "title",
  "description",
  "severity",
  "status",
  "dateReported",
  "dateUpdated",
] as const) {}