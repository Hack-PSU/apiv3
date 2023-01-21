import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { Role } from "common/firebase";

@Table({
  name: "organizers",
  disableByHackathon: true,
})
export class Organizer extends Entity {
  @ID({ type: "string" })
  id: string;

  @Column({ type: "string" })
  firstName: string;

  @Column({ type: "string" })
  lastName: string;

  @Column({ type: "string" })
  email: string;

  privilege: Role;
}
