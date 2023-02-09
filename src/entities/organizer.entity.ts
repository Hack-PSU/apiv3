import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { Role } from "common/gcp";
import { ApiProperty, PickType } from "@nestjs/swagger";

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

  @ApiProperty()
  privilege: Role;
}

export class OrganizerEntity extends PickType(Organizer, [
  "id",
  "firstName",
  "lastName",
  "email",
  "privilege",
] as const) {}
