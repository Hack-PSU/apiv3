import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsString, IsNumber, IsEnum, IsOptional } from "class-validator";

export enum ReservationType {
  PARTICIPANT = "participant",
  ADMIN = "admin",
}

@Table({
  name: "reservations",
  hackathonId: "hackathonId",
})
export class Reservation extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer" })
  locationId: number;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", nullable: true })
  teamId: string | null;

  @ApiProperty({ enum: ReservationType })
  @IsEnum(ReservationType)
  @Column({ type: "string", required: true })
  reservationType: ReservationType = ReservationType.PARTICIPANT;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer" })
  startTime: number;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer" })
  endTime: number;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  hackathonId: string;
}

export class ReservationEntity extends PickType(Reservation, [
  "id",
  "locationId",
  "teamId",
  "reservationType",
  "startTime",
  "endTime",
  "hackathonId",
] as const) {}
