import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  UsePipes,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ProductEntity } from 'entities/product.entity';
import { InventoryHistoryEntity, InventoryEventType } from 'entities/inventory-history.entity';
import { ApiTags, ApiBody, ApiConsumes, ApiProperty, PartialType, OmitType, PickType } from '@nestjs/swagger';
import { ApiDoc } from 'common/docs';
import { Role, Roles } from 'common/gcp';
import { IsString, IsOptional, IsInt, Min, IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express'; // Required for Express.Multer.File type

// --- DTOs ---
// Ideally, these would be in separate files (e.g., src/modules/inventory/dto/)

// Product DTOs
export class CreateProductDto {
  @ApiProperty({ description: 'Name of the product', example: 'Laptop Stand' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description of the product', example: 'Adjustable aluminum laptop stand', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Category of the product', example: 'Electronics Accessories', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Quantity of the product in stock', example: 100 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'User ID associated with the product (optional)', example: 'user-cuid', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Location ID of the product (optional)', example: 1, required: false })
  @IsOptional()
  @IsInt()
  locationId?: number;

  @ApiProperty({ description: 'Additional notes for the product', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ProductPhotoUploadDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Product photo file' })
  photo: any; // Used by swagger for file upload
}

// InventoryHistory DTOs
export class CreateInventoryHistoryDto {
  @ApiProperty({ description: 'ID of the related product (UUID)', example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: InventoryEventType, description: 'Type of inventory event', example: InventoryEventType.ADD })
  @IsEnum(InventoryEventType)
  inventoryEventType: InventoryEventType;

  @ApiProperty({ description: 'Quantity changed in this event', example: 10 })
  @IsInt()
  quantityChanged: number;

  @ApiProperty({ description: 'ID of the user initiating the event (optional)', example: 'user-cuid-initiator', required: false })
  @IsOptional()
  @IsString()
  fromUserId?: string;

  @ApiProperty({ description: 'ID of the user receiving (if applicable, optional)', example: 'user-cuid-receiver', required: false })
  @IsOptional()
  @IsString()
  toUserId?: string;

  @ApiProperty({ description: 'ID of the source location (optional)', example: 1, required: false })
  @IsOptional()
  @IsInt()
  fromLocationId?: number;

  @ApiProperty({ description: 'ID of the destination location (optional)', example: 2, required: false })
  @IsOptional()
  @IsInt()
  toLocationId?: number;

  @ApiProperty({ description: 'Additional notes for the event', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInventoryHistoryDto extends PartialType(
  OmitType(CreateInventoryHistoryDto, ['productId', 'inventoryEventType', 'quantityChanged'] as const)
) {
  // productId, inventoryEventType and quantityChanged are usually not updatable for a history record.
  // Only notes, and potentially user/location references might be corrected.
}


@ApiTags('Inventory')
@Controller('inventory')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // --- Product Endpoints ---
  @Post('products')
  @Roles(Role.TEAM) // Adjust role as needed
  @UseInterceptors(FileInterceptor('photo')) // 'photo' should match the field name in the form-data
  @ApiConsumes('multipart/form-data')
  @ApiDoc({
    summary: 'Create a new product',
    request: {
      body: { type: CreateProductDto }, // Swagger will infer DTO properties
      // For file upload, it's often better to describe manually or use a combined DTO if issues with inference
    },
    response: { created: { type: ProductEntity } },
    auth: Role.TEAM,
  })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.inventoryService.createProduct(createProductDto, photo);
  }

  @Get('products')
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: 'Get all products',
    response: { ok: { type: [ProductEntity] } },
    auth: Role.TEAM,
  })
  findAllProducts() {
    return this.inventoryService.findAllProducts();
  }

  @Get('products/:id')
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: 'Get a specific product by ID',
    params: [{ name: 'id', description: 'Product ID (UUID)' }],
    response: { ok: { type: ProductEntity } },
    auth: Role.TEAM,
  })
  findOneProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findOneProduct(id);
  }

  @Patch('products/:id')
  @Roles(Role.TEAM) // Adjust role as needed
  @UseInterceptors(FileInterceptor('photo')) // 'photo' for the field name
  @ApiConsumes('multipart/form-data')
  @ApiDoc({
    summary: 'Update a product',
    params: [{ name: 'id', description: 'Product ID (UUID)' }],
    request: {
       body: { type: UpdateProductDto },
       // Similar to POST, file upload part
    },
    response: { ok: { type: ProductEntity } },
    auth: Role.TEAM,
  })
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.inventoryService.updateProduct(id, updateProductDto, photo);
  }

  // Delete for Product - As per issue, only POST, GET, PATCH. Add if needed.
  // @Delete('products/:id')
  // @Roles(Role.EXEC) // Example: more restrictive role for deletion
  // @ApiDoc({ summary: 'Delete a product', params: [{ name: 'id', description: 'Product ID' }], response: { ok: { type: ProductEntity } }, auth: Role.EXEC })
  // removeProduct(@Param('id') id: string) {
  //   return this.inventoryService.removeProduct(id);
  // }

  // --- InventoryHistory Endpoints ---
  @Post('history')
  @Roles(Role.TEAM) // Adjust role as needed
  @ApiDoc({
    summary: 'Create a new inventory history record',
    request: { body: { type: CreateInventoryHistoryDto } },
    response: { created: { type: InventoryHistoryEntity } },
    auth: Role.TEAM,
  })
  createInventoryHistory(@Body() createInventoryHistoryDto: CreateInventoryHistoryDto) {
    return this.inventoryService.createInventoryHistory(createInventoryHistoryDto);
  }

  @Get('history')
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: 'Get all inventory history records',
    response: { ok: { type: [InventoryHistoryEntity] } },
    auth: Role.TEAM,
  })
  findAllInventoryHistories() {
    return this.inventoryService.findAllInventoryHistories();
  }

  @Get('history/product/:productId')
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: 'Get all inventory history records for a specific product',
    params: [{ name: 'productId', description: 'Product ID (UUID)' }],
    response: { ok: { type: [InventoryHistoryEntity] } },
    auth: Role.TEAM,
  })
  findInventoryHistoriesForProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.inventoryService.findInventoryHistoriesForProduct(productId);
  }

  @Get('history/:id')
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: 'Get a specific inventory history record by ID',
    params: [{ name: 'id', description: 'Inventory History ID (UUID)' }],
    response: { ok: { type: InventoryHistoryEntity } },
    auth: Role.TEAM,
  })
  findOneInventoryHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findOneInventoryHistory(id);
  }

  @Patch('history/:id')
  @Roles(Role.TEAM) // Adjust role as needed, updating history might be restricted
  @ApiDoc({
    summary: 'Update an inventory history record',
    params: [{ name: 'id', description: 'Inventory History ID (UUID)' }],
    request: { body: { type: UpdateInventoryHistoryDto } },
    response: { ok: { type: InventoryHistoryEntity } },
    auth: Role.TEAM,
  })
  updateInventoryHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInventoryHistoryDto: UpdateInventoryHistoryDto
  ) {
    // Note: The service method for updating history is basic.
    // Real-world scenarios might prevent or complicate history updates.
    return this.inventoryService.updateInventoryHistory(id, updateInventoryHistoryDto);
  }

  // Delete for InventoryHistory - As per issue, only POST, GET, PATCH. Add if needed.
  // @Delete('history/:id')
  // @Roles(Role.EXEC) // Example: More restrictive role
  // @ApiDoc({ summary: 'Delete an inventory history record', params: [{ name: 'id', description: 'Inventory History ID' }], response: { ok: { type: InventoryHistoryEntity } }, auth: Role.EXEC })
  // removeInventoryHistory(@Param('id') id: string) {
  //   return this.inventoryService.removeInventoryHistory(id);
  // }
}
