import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsObject,
} from "class-validator";

export enum ReservationAuditAction {
  CREATE = "create",
  CANCEL = "cancel",
  UPDATE = "update",
  AUTO_CANCEL = "auto_cancel",
}

@Table({
  name: "reservation_audit",
  disableByHackathon: true,
  relationMappings: {
    reservation: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "reservation.entity.js",
      join: {
        from: "reservation_audit.reservationId",
        to: "reservations.id",
      },
    },
    actorUser: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "user.entity.js",
      join: {
        from: "reservation_audit.actorUserId",
        to: "users.id",
      },
    },
  },
})
export class ReservationAudit extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  reservationId: string;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", nullable: true })
  actorUserId: string | null;

  @ApiProperty({ enum: ReservationAuditAction })
  @IsEnum(ReservationAuditAction)
  @Column({ type: "string" })
  action: ReservationAuditAction;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsObject()
  @Column({ type: "json", nullable: true })
  meta: any | null;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer" })
  createdAt: number;
}

export class ReservationAuditEntity extends PickType(ReservationAudit, [
  "id",
  "reservationId",
  "actorUserId",
  "action",
  "meta",
  "createdAt",
] as const) {}
