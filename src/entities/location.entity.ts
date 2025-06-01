import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsInt, IsString } from "class-validator"; // Changed from IsString

// Removed imports for Product and InventoryHistory as relations are being removed

@Table({
  name: "locations",
  disableByHackathon: true,
  // Removed relationMappings for products, inventoryHistoriesFrom, inventoryHistoriesTo
  relationMappings: {},
})
export class Location extends Entity {
  @ApiProperty({ type: Number, description: "Location ID" }) // Changed type to Number
  @IsInt() // Changed from IsString to IsInt
  @ID({ type: "integer" }) // Changed type to integer
  id: number; // Changed type from string to number

  @ApiProperty()
  @IsString() // Kept IsString for name
  @Column({ type: "string" })
  name: string;

  // Removed relation properties: products, inventoryHistoriesFrom, inventoryHistoriesTo
}

export class LocationEntity extends PickType(Location, [
  "id",
  "name",
] as const) {}
