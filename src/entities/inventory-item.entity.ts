import { Entity } from "entities/base.entity";
import { Column, ID, Table } from "common/objection";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

@Table({
  name: "inventory_items",
  relationMappings: {
    category: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "inventory-category.entity.js",
      join: {
        from: "inventory_items.categoryId",
        to: "inventory_categories.id",
      },
    },
    holderLocation: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "location.entity.js",
      join: {
        from: "inventory_items.holderLocationId",
        to: "locations.id",
      },
    },
    holderOrganizer: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "organizer.entity.js",
      join: {
        from: "inventory_items.holderOrganizerId",
        to: "organizers.id",
      },
    },
    movements: {
      relation: Entity.HasManyRelation,
      modelClass: "inventory-movement.entity.js",
      join: {
        from: "inventory_items.id",
        to: "inventory_movements.itemId",
      },
    },
  },
})
export class InventoryItem extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  id: string; // UUID

  @ApiProperty()
  @Column({ type: "number" })
  categoryId: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  assetTag?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  serialNumber?: string;

  @ApiProperty({
    enum: ["active", "checked_out", "lost", "disposed", "archived"],
    default: "active",
  })
  @IsEnum(["active", "checked_out", "lost", "disposed", "archived"])
  @Column({ type: "string" })
  status: "active" | "checked_out" | "lost" | "disposed" | "archived" =
    "active";

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @Column({ type: "number", required: false, nullable: true })
  holderLocationId?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  holderOrganizerId?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  notes?: string;

  @ApiProperty()
  @Type(() => Number)
  @Column({ type: "integer" })
  createdAt: number;

  @ApiProperty()
  @Type(() => Number)
  @Column({ type: "integer" })
  updatedAt: number;
}

export class InventoryItemEntity extends PickType(InventoryItem, [
  "id",
  "categoryId",
  "name",
  "assetTag",
  "serialNumber",
  "status",
  "holderLocationId",
  "holderOrganizerId",
  "notes",
  "createdAt",
  "updatedAt",
] as const) {}
