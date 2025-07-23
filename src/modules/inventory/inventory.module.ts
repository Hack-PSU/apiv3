// modules/inventory/inventory.module.ts
import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";

import { InventoryCategory } from "entities/inventory-category.entity";
import { InventoryItem } from "entities/inventory-item.entity";
import { InventoryMovement } from "entities/inventory-movement.entity";

import { InventoryController } from "./inventory.controller";

import { Organizer } from "entities/organizer.entity";

@Module({
  imports: [
    ObjectionModule.forFeature([
      InventoryCategory,
      InventoryItem,
      InventoryMovement,
      Organizer,
    ]),
  ],
  controllers: [InventoryController],
})
export class InventoryModule {}
