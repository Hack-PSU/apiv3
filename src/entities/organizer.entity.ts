import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { Role } from "common/gcp";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsString } from "class-validator";
import { Expose } from "class-transformer";
import { ControllerMethod } from "common/validation";

@Table({
  name: "organizers",
  disableByHackathon: true,
  relationMappings: {
    scans: {
      relation: Entity.HasManyRelation,
      modelClass: "scan.entity.js",
      join: {
        from: "organizers.id",
        to: "scans.organizerId",
      },
    },
  },
})
export class Organizer extends Entity {
  @ApiProperty()
  @Expose({ groups: [ControllerMethod.POST] })
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  firstName: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @Column({ type: "string" })
  email: string;

  @ApiProperty({
    type: "number",
    description:
      "An organizer's permission level: 0 (NONE), 1 (Volunteer), 2 (Team), 3 (Exec), 4 (Tech Director)",
  })
  @IsEnum(Role)
  privilege: Role;
}

export class OrganizerEntity extends PickType(Organizer, [
  "id",
  "firstName",
  "lastName",
  "email",
  "privilege",
] as const) {}
