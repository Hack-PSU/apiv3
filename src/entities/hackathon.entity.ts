import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import Objection from "objection";

@Table({
  name: "hackathons",
})
export class Hackathon extends Entity {
  @ID({ type: "string" })
  id: string;

  @Column({ type: "string" })
  name: string;

  @Column({ type: "integer" })
  startTime: string;

  @Column({ type: "integer" })
  endTime: string;

  @Column({ type: "boolean" })
  active: boolean;

  $parseDatabaseJson(json: Objection.Pojo): Objection.Pojo {
    json = super.$parseDatabaseJson(json);

    return {
      ...json,
      // map database active field to boolean
      active: json.active === 1,
    };
  }
}
