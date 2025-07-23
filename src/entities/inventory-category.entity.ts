import { Entity } from "entities/base.entity";
import { Column, ID, Table } from "common/objection";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

@Table({
  name: "inventory_categories",
  relationMappings: {
    items: {
      relation: Entity.HasManyRelation,
      modelClass: "inventory-item.entity.js",
      join: {
        from: "inventory_categories.id",
        to: "inventory_items.categoryId",
      },
    },
  },
})
export class InventoryCategory extends Entity {
  @ApiProperty()
  @ID({ type: "integer" })
  id: number;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  name: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  description?: string;
}

export class InventoryCategoryEntity extends PickType(InventoryCategory, [
  "id",
  "name",
  "description",
] as const) {}
