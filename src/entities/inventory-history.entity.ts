import { IsString, IsOptional, IsInt, IsEnum } from "class-validator";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { Entity } from "./base.entity";
import { Column, ID, Table } from "common/objection";

import { User } from "./user.entity";
import { Location } from "./location.entity";
import { Product } from "./product.entity";

export enum InventoryEventType {
  ADD = "ADD",
  REMOVE = "REMOVE",
  CHECKOUT = "CHECKOUT",
  RETURN = "RETURN",
  TRANSFER = "TRANSFER",
  OTHER = "OTHER",
}

@Table({
  name: "inventory_history",
  disableByHackathon: true,
  relationMappings: {
    product: {
      relation: Entity.BelongsToOneRelation,
      modelClass: Product,
      join: {
        from: "inventory_history.productId",
        to: "products.id",
      },
    },
    HistoryFromUser: {
      relation: Entity.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: "inventory_history.fromUserId",
        to: "users.id",
      },
    },
    HistoryToUser: {
      relation: Entity.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: "inventory_history.toUserId",
        to: "users.id",
      },
    },
    HistoryFromLocation: {
      relation: Entity.BelongsToOneRelation,
      modelClass: Location,
      join: {
        from: "inventory_history.fromLocationId",
        to: "locations.id",
      },
    },
    HistoryToLocation: {
      relation: Entity.BelongsToOneRelation,
      modelClass: Location,
      join: {
        from: "inventory_history.toLocationId",
        to: "locations.id",
      },
    },
  },
})
export class InventoryHistory extends Entity {
  @ApiProperty({ type: String, description: "Inventory History ID (CUID)" })
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty({ type: String, description: "ID of the related product" })
  @IsString()
  @Column({ type: "string" })
  productId: string;

  @ApiProperty({
    enum: InventoryEventType,
    description: "Type of inventory event",
  })
  @IsEnum(InventoryEventType)
  @Column({ type: "string" })
  inventoryEventType: InventoryEventType;

  @ApiProperty({ type: Number, description: "Quantity changed in this event" })
  @IsInt()
  @Column({ type: "integer" })
  quantityChanged: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "ID of the user initiating the event",
  })
  @IsOptional()
  @IsString()
  @Column({ type: "string", nullable: true })
  fromUserId?: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "ID of the user receiving (if applicable)",
  })
  @IsOptional()
  @IsString()
  @Column({ type: "string", nullable: true })
  toUserId?: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "ID of the source location",
  })
  @IsOptional()
  @IsInt()
  @Column({ type: "integer", nullable: true })
  fromLocationId?: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "ID of the destination location",
  })
  @IsOptional()
  @IsInt()
  @Column({ type: "integer", nullable: true })
  toLocationId?: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Additional notes for the event",
  })
  @IsOptional()
  @IsString()
  @Column({ type: "string", nullable: true })
  notes?: string;

  @ApiProperty({
    type: Number,
    description: "Unix‐millisecond timestamp of the inventory event (BIGINT)",
  })
  @IsInt()
  @Column({ type: "integer" })
  timestamp: number;

  // Relation properties (optional)
  product?: Product;
  fromUser?: User;
  toUser?: User;
  fromLocation?: Location;
  toLocation?: Location;
}

const inventoryHistoryFields = [
  "id",
  "productId",
  "inventoryEventType",
  "quantityChanged",
  "fromUserId",
  "toUserId",
  "fromLocationId",
  "toLocationId",
  "notes",
  "timestamp",
] as const;

export class InventoryHistoryEntity extends PickType(
  InventoryHistory,
  inventoryHistoryFields,
) {}
