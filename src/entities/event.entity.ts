import { ApiProperty, PickType } from "@nestjs/swagger";
import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";

@Table({
  name: "events",
  relationMappings: {
    location: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "location.entity.js",
      join: {
        from: "events.locationId",
        to: "locations.id",
      },
    },
  },
  hackathonId: "hackathonId",
})
export class Event extends Entity {
  @ApiProperty()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @Column({ type: "string" })
  name: string;

  @ApiProperty()
  @Column({ type: "string" })
  type: "activity" | "food" | "workshop" | "checkIn";

  @ApiProperty()
  @Column({ type: "string", required: false, nullable: true })
  description: string;

  @ApiProperty()
  @Column({ type: "integer", required: false, nullable: true })
  locationId: number;

  @ApiProperty()
  @Column({ type: "string", required: false, nullable: true })
  icon?: string;

  @ApiProperty()
  @Column({ type: "integer" })
  startTime: number;

  @ApiProperty()
  @Column({ type: "integer" })
  endTime: number;

  @ApiProperty({ required: false })
  @Column({ type: "string", required: false, nullable: true })
  wsPresenterNames?: string;

  @ApiProperty({ required: false })
  @Column({ type: "string", required: false, nullable: true })
  wsRelevantSkills?: string;

  @ApiProperty({ required: false })
  @Column({ type: "string", required: false, nullable: true })
  wsSkillLevel?: string;

  @ApiProperty({ required: false })
  @Column({ type: "string", required: false, nullable: true })
  wsUrls?: string;

  @ApiProperty({ required: false })
  @Column({ type: "string", nullable: true })
  hackathonId?: string;
}

export class EventEntity extends PickType(Event, [
  "id",
  "name",
  "type",
  "description",
  "locationId",
  "icon",
  "startTime",
  "endTime",
  "wsPresenterNames",
  "wsRelevantSkills",
  "wsSkillLevel",
  "wsUrls",
  "hackathonId",
] as const) {}
