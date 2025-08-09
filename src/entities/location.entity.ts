import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsString, IsNumber, IsBoolean } from "class-validator";

@Table({
  name: "locations",
  hackathonId: "hackathonId",
})
export class Location extends Entity {
  @ApiProperty()
  @ID({ type: "integer" })
  id: number;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  name: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  hackathonId?: string;

  @ApiProperty()
  @IsBoolean()
  @Column({ type: "boolean", required: true })
  isBookable: boolean = false;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer", required: true })
  teamCapacity: number = 1;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer", required: true })
  minReservationMins: number = 30;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer", required: true })
  maxReservationMins: number = 120;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer", required: true })
  bufferMins: number = 0;
}

export class LocationEntity extends PickType(Location, [
  "id",
  "name",
  "hackathonId",
  "isBookable",
  "teamCapacity",
  "minReservationMins",
  "maxReservationMins",
  "bufferMins",
] as const) {}
