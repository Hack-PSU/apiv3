import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsString } from "class-validator";

@Table({
  name: "locations",
  disableByHackathon: true,
})
export class Location extends Entity {
  @ApiProperty()
  @ID({ type: "integer" })
  id: number;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  name: string;
}

export class LocationEntity extends PickType(Location, [
  "id",
  "name",
] as const) {}
