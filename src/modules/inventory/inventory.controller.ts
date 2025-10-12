// modules/inventory/inventory.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  OmitType,
  PartialType,
  PickType,
  IntersectionType,
} from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { InjectRepository, Repository } from "common/objection";
import { Roles, Role } from "common/gcp";
import { nanoid } from "nanoid";
import { Request } from "express";

import {
  InventoryCategory,
  InventoryCategoryEntity,
} from "entities/inventory-category.entity";
import {
  InventoryItem,
  InventoryItemEntity,
} from "entities/inventory-item.entity";
import {
  InventoryMovement,
  InventoryMovementEntity,
} from "entities/inventory-movement.entity";
import { Organizer } from "entities/organizer.entity";

// ---------- DTOs ----------

// Category
class CreateCategoryDto extends OmitType(InventoryCategoryEntity, [
  "id",
] as const) {}

// Item
class BaseCreateItemDto extends OmitType(InventoryItemEntity, [
  "id",
  "createdAt",
  "updatedAt",
  "status",
] as const) {}
class OptionalItemStatus extends PartialType(
  PickType(InventoryItemEntity, ["status"] as const),
) {}
class CreateItemDto extends IntersectionType(
  BaseCreateItemDto,
  OptionalItemStatus,
) {}

class UpdateItemDto extends OmitType(BaseCreateItemDto, [
  "categoryId",
  "holderLocationId",
  "holderOrganizerId"
] as const) {}

// Movement
class CreateMovementDto extends OmitType(InventoryMovementEntity, [
  "id",
  "createdAt",
  "movedByOrganizerId",
] as const) {}

// ---------- CONTROLLER ----------
@ApiTags("Inventory")
@Controller("inventory")
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class InventoryController {
  constructor(
    @InjectRepository(InventoryCategory)
    private readonly catRepo: Repository<InventoryCategory>,
    @InjectRepository(InventoryItem)
    private readonly itemRepo: Repository<InventoryItem>,
    @InjectRepository(InventoryMovement)
    private readonly moveRepo: Repository<InventoryMovement>,
    @InjectRepository(Organizer)
    private readonly orgRepo: Repository<Organizer>,
  ) {}

  // ===== CATEGORIES =====
  @Get("categories")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "List all inventory categories",
    response: { ok: { type: InventoryCategoryEntity, isArray: true } },
    auth: Role.TEAM,
  })
  async getCategories(): Promise<InventoryCategory[]> {
    return this.catRepo.findAll().exec();
  }

  @Post("categories")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Create an inventory category",
    request: { body: { type: CreateCategoryDto }, validate: true },
    response: { created: { type: InventoryCategoryEntity } },
    auth: Role.TEAM,
  })
  async createCategory(
    @Body() dto: CreateCategoryDto,
  ): Promise<InventoryCategory> {
    return this.catRepo.createOne(dto).exec();
  }

  @Delete("categories/:id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Delete an inventory category",
    params: [{ name: "id" }],
    response: { noContent: true },
    auth: Role.TEAM,
  })
  async deleteCategory(@Param("id") id: number): Promise<void> {
    try {
      await this.catRepo.deleteOne(id).exec();
    } catch {
      throw new BadRequestException("Cannot delete category that is in use.");
    }
  }

  // ===== ITEMS =====
  @Get("items")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "List all inventory items",
    response: { ok: { type: InventoryItemEntity, isArray: true } },
    auth: Role.TEAM,
  })
  async getItems(): Promise<InventoryItem[]> {
    return this.itemRepo.findAll().exec();
  }

  @Post("items")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Create an inventory item",
    request: { body: { type: CreateItemDto }, validate: true },
    response: { created: { type: InventoryItemEntity } },
    auth: Role.TEAM,
  })
  async createItem(@Body() dto: CreateItemDto): Promise<InventoryItem> {
    const now = Date.now();
    const item: Partial<InventoryItem> = {
      id: nanoid(36),
      status: dto.status ?? "active",
      createdAt: now,
      updatedAt: now,
      ...dto,
    };
    return this.itemRepo.createOne(item).exec();
  }

  @Patch("items/:id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Update an inventory item's name, asset tag, serial number, or note",
    request: { body: { type: UpdateItemDto }, validate: true },
    params: [{ name: "id" }],
    response: { ok: { type: InventoryItemEntity } },
    auth: Role.TEAM
  })
  async updateItem(@Param("id") id: string, @Body() dto: CreateItemDto): Promise<InventoryItem> {
    // Validate the dto: item should (at least) have one of the following: name, asset tag, serial number
    if (!dto.name.trim() && !dto.assetTag.trim() && !dto.serialNumber.trim()) 
      throw new ForbiddenException("Item must have a name, asset tag, or serial number");

    // Get the item
    const item = await this.itemRepo.findOne(id).exec();
    if (!item) throw new NotFoundException("Item not found");
    
    // Update the new values and patch
    Object.assign(item, dto);
    return this.itemRepo.patchOne(id, item).exec();
  }

  @Delete("items/:id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Soft delete an inventory item (status -> archived)",
    params: [{ name: "id" }],
    response: { ok: { type: InventoryItemEntity } },
    auth: Role.TEAM,
  })
  async deleteItem(@Param("id") id: string): Promise<InventoryItem> {
    const item = await this.itemRepo.findOne(id).exec();
    if (!item) throw new BadRequestException("Item not found");
    item.status = "archived";
    item.updatedAt = Date.now();
    return this.itemRepo.patchOne(id, item).exec();
  }

  // ===== MOVEMENTS =====
  @Get("movements")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "List all inventory movements",
    response: { ok: { type: InventoryMovementEntity, isArray: true } },
    auth: Role.TEAM,
  })
  async getMovements(): Promise<InventoryMovement[]> {
    return this.moveRepo.findAll().exec();
  }

  @Post("movements")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Create a movement record (also updates item's holder fields)",
    request: { body: { type: CreateMovementDto }, validate: true },
    response: { created: { type: InventoryMovementEntity } },
    auth: Role.TEAM,
  })
  async createMovement(
    @Body() dto: CreateMovementDto,
    @Req() req: Request,
  ): Promise<InventoryMovement> {
    const moverId = (req.user as any)?.sub;
    if (!moverId) throw new BadRequestException("Missing mover (auth user).");

    // Validate mover
    const mover = await this.orgRepo.findOne(moverId).exec();
    if (!mover) throw new BadRequestException("Mover organizer not found");

    // Validate item
    const item = await this.itemRepo.findOne(dto.itemId).exec();
    if (!item) throw new BadRequestException("Item not found");

    // Validate current location/organizer matches 'from' fields if provided
    if (
      dto.fromLocationId !== undefined &&
      item.holderLocationId !== dto.fromLocationId
    ) {
      throw new BadRequestException(
        `Item is not at the specified 'from' location. Current location: ${item.holderLocationId}, Expected: ${dto.fromLocationId}`,
      );
    }

    if (
      dto.fromOrganizerId !== undefined &&
      item.holderOrganizerId !== dto.fromOrganizerId
    ) {
      throw new BadRequestException(
        `Item is not with the specified 'from' organizer. Current organizer: ${item.holderOrganizerId}, Expected: ${dto.fromOrganizerId}`,
      );
    }

    // Validate business rules for specific movements
    if (dto.reason === "return" && item.status !== "checked_out") {
      throw new BadRequestException(
        "Cannot return an item that is not checked out",
      );
    }

    if (dto.reason === "checkout" && item.status !== "active") {
      throw new BadRequestException(
        "Cannot checkout an item that is not active",
      );
    }

    const now = Date.now();

    // Create movement
    const movement: Partial<InventoryMovement> = {
      id: nanoid(36),
      createdAt: now,
      movedByOrganizerId: mover.id,
      ...dto,
    };

    // Update item holder + status with comprehensive logic
    item.holderLocationId = dto.toLocationId ?? null;
    item.holderOrganizerId = dto.toOrganizerId ?? null;
    item.updatedAt = now;

    switch (dto.reason) {
      case "lost":
        item.status = "lost";
        // Clear holder information for lost items
        item.holderLocationId = null;
        item.holderOrganizerId = null;
        break;
      case "disposed":
        item.status = "disposed";
        // Clear holder information for disposed items
        item.holderLocationId = null;
        item.holderOrganizerId = null;
        break;
      case "checkout":
        item.status = "checked_out";
        break;
      case "return":
        item.status = "active";
        break;
      case "repair":
        // Item under repair remains active but location/organizer is updated
        // Status stays the same unless it was previously lost/disposed
        if (item.status === "lost" || item.status === "disposed") {
          item.status = "active";
        }
        break;
      case "transfer":
        // Transfer keeps current status unless item was lost/disposed
        if (item.status === "lost" || item.status === "disposed") {
          item.status = "active";
        }
        break;
      case "other":
        // For 'other' movements, status logic depends on context
        // Keep current status unless explicitly moving from lost/disposed
        if (item.status === "lost" || item.status === "disposed") {
          item.status = "active";
        }
        break;
      default:
        // Keep current status for any other reasons
        break;
    }

    await this.itemRepo.patchOne(item.id, item).exec();
    return this.moveRepo.createOne(movement).exec();
  }

  @Delete("movements/:id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Delete a movement record (admin fix only)",
    params: [{ name: "id" }],
    response: { noContent: true },
    auth: Role.TEAM,
  })
  async deleteMovement(@Param("id") id: string): Promise<void> {
    await this.moveRepo.deleteOne(id).exec();
  }
}
