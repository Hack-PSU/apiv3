import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsString, IsNumber, IsEnum, IsOptional } from "class-validator";

export enum ReservationType {
  TEAM = "team",
  BLACKOUT = "blackout",
}

export enum ReservationStatus {
  CONFIRMED = "confirmed",
  CANCELED = "canceled",
}

@Table({
  name: "reservations",
  hackathonId: "hackathonId",
  relationMappings: {
    location: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "location.entity.js",
      join: {
        from: "reservations.locationId",
        to: "locations.id",
      },
    },
    createdByUser: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "user.entity.js",
      join: {
        from: "reservations.createdByUserId",
        to: "users.id",
      },
    },
    hackathon: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "hackathon.entity.js",
      join: {
        from: "reservations.hackathonId",
        to: "hackathons.id",
      },
    },
  },
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
  type: ReservationType = ReservationType.TEAM;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer" })
  startTime: number;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer" })
  endTime: number;

  @ApiProperty({ enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  @Column({ type: "string", required: true })
  status: ReservationStatus = ReservationStatus.CONFIRMED;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  createdByUserId: string;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer" })
  createdAt: number;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Column({ type: "integer", nullable: true })
  canceledAt: number | null;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", nullable: true })
  cancelReason: string | null;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  hackathonId: string;
}

export class ReservationEntity extends PickType(Reservation, [
  "id",
  "locationId",
  "teamId",
  "type",
  "startTime",
  "endTime",
  "status",
  "createdByUserId",
  "createdAt",
  "canceledAt",
  "cancelReason",
  "hackathonId",
] as const) {}
