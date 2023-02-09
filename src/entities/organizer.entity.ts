import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { Role } from "common/gcp";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { Hackathon } from "entities/hackathon.entity";

@Table({
  name: "organizers",
  disableByHackathon: true,
  relationMappings: {
    scans: {
      relation: Entity.HasManyRelation,
      modelClass: "scan.entity.js",
      join: {
        from: "users.id",
        to: "scans.userId",
      },
    },
  },
  modifiers: {
    scansByHackathon: (qb, byHackathon?: string) => {
      if (!byHackathon) {
        return qb.where(
          "scans.hackathonId",
          Hackathon.query().findOne({ active: true }),
        );
      } else {
        return qb.where("scans.hackathonId", byHackathon);
      }
    },
  },
})
export class Organizer extends Entity {
  @ApiProperty()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @Column({ type: "string" })
  firstName: string;

  @ApiProperty()
  @Column({ type: "string" })
  lastName: string;

  @ApiProperty()
  @Column({ type: "string" })
  email: string;

  @ApiProperty({
    type: "number",
    description:
      "An organizer's permission level: 0 (NONE), 1 (Volunteer), 2 (Team), 3 (Exec), 4 (Tech Director)",
  })
  privilege: Role;
}

export class OrganizerEntity extends PickType(Organizer, [
  "id",
  "firstName",
  "lastName",
  "email",
  "privilege",
] as const) {}
