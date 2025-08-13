import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

@Table({
  name: "scans",
  relationMappings: {
    user: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "user.entity.js",
      join: {
        from: "scans.userId",
        to: "users.id",
      },
    },
    organizer: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "organizer.entity.js",
      join: {
        from: "scans.organizerId",
        to: "organizers.id",
      },
    },
    event: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "event.entity.js",
      filter: (qb) => qb.select("id", "type"),
      join: {
        from: "scans.eventId",
        to: "events.id",
      },
    },
  },
})
export class Scan extends Entity {
  @ID({ type: "string" })
  @ApiProperty()
  @IsString()
  eventId: string;

  @ID({ type: "string" })
  @ApiProperty()
  @IsString()
  userId: string;

  @Column({ type: "string" })
  @IsString()
  organizerId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false })
  hackathonId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Column({ type: "integer", required: false })
  timestamp?: number;
}

export class ScanEntity extends PickType(Scan, [
  "eventId",
  "userId",
  "organizerId",
  "hackathonId",
  "timestamp",
] as const) {}
