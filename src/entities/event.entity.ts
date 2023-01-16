import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";

@Table({
  name: "events",
  relationMappings: {
    location: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "Location",
      join: {
        from: "events.locationId",
        to: "locations.id",
      },
    },
  },
  hackathonId: "hackathonId",
})
export class Event extends Entity {
  @ID({ type: "string" })
  id: string;

  @Column({ type: "string" })
  name: string;

  @Column({ type: "string" })
  type: "activity" | "food" | "workshop";

  @Column({ type: "string", required: false, nullable: true })
  description: string;

  @Column({ type: "integer", required: false, nullable: true })
  locationId: number;

  @Column({ type: "string", required: false, nullable: true })
  icon?: string;

  @Column({ type: "integer" })
  startTime: number;

  @Column({ type: "integer" })
  endTime: number;

  @Column({ type: "string", required: false, nullable: true })
  wsPresenterNames?: string;

  @Column({ type: "string", required: false, nullable: true })
  wsRelevantSkills?: string;

  @Column({ type: "string", required: false, nullable: true })
  wsSkillLevel?: string;

  @Column({ type: "string", required: false, nullable: true })
  wsUrls?: string;

  @Column({ type: "string", nullable: true })
  hackathonId?: string;
}
