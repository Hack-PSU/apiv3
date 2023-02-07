import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";

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
  @ApiProperty()
  @ID({ type: "number" })
  id: number;

  @ApiProperty()
  @Column({ type: "string" })
  eventId: string;

  @ApiProperty()
  @Column({ type: "string" })
  userId: string;

  @Column({ type: "string" })
  organizerId: string;

  @ApiProperty({ required: false })
  @Column({ type: "string" })
  hackathonId: string;
}

export class ScanEntity extends PickType(Scan, [
  "id",
  "eventId",
  "userId",
  "organizerId",
  "hackathonId",
]) {}
