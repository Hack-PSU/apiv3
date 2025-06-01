import { Module } from '@nestjs/common';
import { ObjectionModule } from 'common/objection';
import { Product } from 'entities/product.entity';
import { InventoryHistory } from 'entities/inventory-history.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [ObjectionModule.forFeature([Product, InventoryHistory])],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
