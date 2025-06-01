import { IsString, IsOptional, IsInt, Min, IsDate } from "class-validator";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { Entity } from "./base.entity";
import { Column, ID, Table } from "common/objection";
import { User } from "./user.entity";
import { Location } from "./location.entity";

@Table({
  name: "products",
  relationMappings: {
    user: {
      relation: Entity.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: "products.userId",
        to: "users.id",
      },
    },
    location: {
      relation: Entity.BelongsToOneRelation,
      modelClass: Location,
      join: {
        from: "products.locationId",
        to: "locations.id",
      },
    },
    histories: {
      relation: Entity.HasManyRelation,
      modelClass: "./inventory-history.entity", // string path for Objection
      join: {
        from: "products.id",
        to: "inventory_history.productId",
      },
    },
  },
})
export class Product extends Entity {
  @ApiProperty({ type: String, description: "Product ID (CUID)" })
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty({ type: String, description: "Name of the product" })
  @IsString()
  @Column({ type: "string" })
  name: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Description of the product",
  })
  @IsOptional()
  @IsString()
  @Column({ type: "string", nullable: true })
  description?: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "URL of the product photo",
  })
  @IsOptional()
  @IsString()
  @Column({ type: "string", nullable: true })
  photoUrl?: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Category of the product",
  })
  @IsOptional()
  @IsString()
  @Column({ type: "string", nullable: true })
  category?: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Additional notes for the product",
  })
  @IsOptional()
  @IsString()
  // Migration: table.text("notes", "longtext")
  @Column({ type: "string", nullable: true })
  notes?: string;

  @ApiProperty({
    type: Number,
    default: 0,
    description: "Quantity of the product in stock",
  })
  @IsInt()
  @Min(0)
  @Column({ type: "integer" })
  quantity: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "User ID associated with the product",
  })
  @IsOptional()
  @IsString()
  // Migration: table.string("userId")
  @Column({ type: "string", nullable: true })
  userId?: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Location ID of the product",
  })
  @IsOptional()
  @IsInt()
  // Migration: table.integer("locationId").unsigned()
  @Column({ type: "integer", nullable: true })
  locationId?: number;

  @ApiProperty({ type: Date, description: "Timestamp of product creation" })
  @IsDate()
  // Migration: table.timestamp("createdAt").notNullable()
  @Column({ type: "number" })
  createdAt: Date;

  @ApiProperty({ type: Date, description: "Timestamp of last product update" })
  @IsDate()
  // Migration: table.timestamp("updatedAt").notNullable()
  @Column({ type: "number" })
  updatedAt: Date;

  // Optional relation properties
  user?: User;
  location?: Location;
  histories?: import("./inventory-history.entity").InventoryHistory[];
}

const productFields = [
  "id",
  "name",
  "description",
  "photoUrl",
  "category",
  "notes",
  "quantity",
  "userId",
  "locationId",
  "createdAt",
  "updatedAt",
] as const;

export class ProductEntity extends PickType(Product, productFields) {}
