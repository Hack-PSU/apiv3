import { apiFetch } from "../apiClient";
import {
    CreateCategoryDto,
    CreateItemDto,
    CreateMovementDto,
    InventoryCategoryEntity,
    InventoryItemEntity,
    InventoryMovementEntity,
    UpdateItemDto,
} from "./entity";

// Categories
export async function getCategories(): Promise<InventoryCategoryEntity[]> {
    return await apiFetch<InventoryCategoryEntity[]>("inventory/categories");
}

export async function createCategory(
    data: CreateCategoryDto,
): Promise<InventoryCategoryEntity> {
    return await apiFetch<InventoryCategoryEntity>("inventory/categories", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function deleteCategory(id: number): Promise<void> {
    return await apiFetch<void>(`inventory/categories/${id}`, {
        method: "DELETE",
    });
}

// Items
export async function getItems(): Promise<InventoryItemEntity[]> {
    return await apiFetch<InventoryItemEntity[]>("inventory/items");
}

export async function createItem(data: CreateItemDto): Promise<InventoryItemEntity> {
    return await apiFetch<InventoryItemEntity>("inventory/items", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateItem(
    id: string,
    data: UpdateItemDto,
): Promise<InventoryItemEntity> {
    return await apiFetch<InventoryItemEntity>(`inventory/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export async function deleteItem(id: string): Promise<InventoryItemEntity> {
    return await apiFetch<InventoryItemEntity>(`inventory/items/${id}`, {
        method: "DELETE",
    });
}

// Movements
export async function getMovements(): Promise<InventoryMovementEntity[]> {
    return await apiFetch<InventoryMovementEntity[]>("inventory/movements");
}

export async function createMovement(
    data: CreateMovementDto,
): Promise<InventoryMovementEntity> {
    return await apiFetch<InventoryMovementEntity>("inventory/movements", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function deleteMovement(id: string): Promise<void> {
    return await apiFetch<void>(`inventory/movements/${id}`, {
        method: "DELETE",
    });
}
