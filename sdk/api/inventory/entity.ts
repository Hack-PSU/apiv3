export interface InventoryCategoryEntity {
  id: number;
  name: string;
  description?: string;
}

export interface InventoryItemEntity {
  id: string;
  categoryId: number;
  name?: string;
  assetTag?: string;
  serialNumber?: string;
  status: "active" | "checked_out" | "lost" | "disposed" | "archived";
  holderLocationId?: number;
  holderOrganizerId?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryMovementEntity {
  id: string;
  itemId: string;
  fromLocationId?: number;
  fromOrganizerId?: string;
  toLocationId?: number;
  toOrganizerId?: string;
  reason:
  | "checkout"
  | "return"
  | "transfer"
  | "lost"
  | "disposed"
  | "repair"
  | "other";
  notes?: string;
  movedByOrganizerId: string;
  createdAt: number;
}

// DTOs

export type CreateCategoryDto = Omit<InventoryCategoryEntity, "id">;

export type CreateItemDto = Omit<
  InventoryItemEntity,
  "id" | "createdAt" | "updatedAt" | "status"
> & {
  status?: InventoryItemEntity["status"];
};

export type UpdateItemDto = Omit<
  CreateItemDto,
  "categoryId" | "holderLocationId" | "holderOrganizerId"
>;

export type CreateMovementDto = Omit<
  InventoryMovementEntity,
  "id" | "createdAt" | "movedByOrganizerId"
>;
