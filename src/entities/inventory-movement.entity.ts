import { Entity } from "entities/base.entity";
import { Column, ID, Table } from "common/objection";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

@Table({
  name: "inventory_movements",
  relationMappings: {
    item: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "inventory-item.entity.js",
      join: {
        from: "inventory_movements.itemId",
        to: "inventory_items.id",
      },
    },
    fromLocation: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "location.entity.js",
      join: {
        from: "inventory_movements.fromLocationId",
        to: "locations.id",
      },
    },
    toLocation: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "location.entity.js",
      join: {
        from: "inventory_movements.toLocationId",
        to: "locations.id",
      },
    },
    fromOrganizer: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "organizer.entity.js",
      join: {
        from: "inventory_movements.fromOrganizerId",
        to: "organizers.id",
      },
    },
    toOrganizer: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "organizer.entity.js",
      join: {
        from: "inventory_movements.toOrganizerId",
        to: "organizers.id",
      },
    },
    movedBy: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "organizer.entity.js",
      join: {
        from: "inventory_movements.movedByOrganizerId",
        to: "organizers.id",
      },
    },
  },
})
export class InventoryMovement extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  id: string; // UUID

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  itemId: string;

  // FROM
  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @Column({ type: "number", required: false, nullable: true })
  fromLocationId?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  fromOrganizerId?: string;

  // TO
  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @Column({ type: "number", required: false, nullable: true })
  toLocationId?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  toOrganizerId?: string;

  @ApiProperty({
    enum: [
      "checkout",
      "return",
      "transfer",
      "lost",
      "disposed",
      "repair",
      "other",
    ],
  })
  @IsEnum([
    "checkout",
    "return",
    "transfer",
    "lost",
    "disposed",
    "repair",
    "other",
  ])
  @Column({ type: "string" })
  reason:
    | "checkout"
    | "return"
    | "transfer"
    | "lost"
    | "disposed"
    | "repair"
    | "other";

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  notes?: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  movedByOrganizerId: string;

  @ApiProperty()
  @Type(() => Number)
  @Column({ type: "integer" })
  createdAt: number;
}

export class InventoryMovementEntity extends PickType(InventoryMovement, [
  "id",
  "itemId",
  "fromLocationId",
  "fromOrganizerId",
  "toLocationId",
  "toOrganizerId",
  "reason",
  "notes",
  "movedByOrganizerId",
  "createdAt",
] as const) {}
