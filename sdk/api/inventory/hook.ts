import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createCategory,
    createItem,
    createMovement,
    deleteCategory,
    deleteItem,
    deleteMovement,
    getCategories,
    getItems,
    getMovements,
    updateItem,
} from "./provider";
import {
    CreateCategoryDto,
    CreateItemDto,
    CreateMovementDto,
    InventoryCategoryEntity,
    InventoryItemEntity,
    InventoryMovementEntity,
    UpdateItemDto,
} from "./entity";

export const inventoryQueryKeys = {
    categories: ["inventory-categories"] as const,
    items: ["inventory-items"] as const,
    movements: ["inventory-movements"] as const,
};

// Categories
export function useInventoryCategories() {
    return useQuery<InventoryCategoryEntity[]>({
        queryKey: inventoryQueryKeys.categories,
        queryFn: getCategories,
    });
}

export function useCreateInventoryCategory() {
    const client = useQueryClient();
    return useMutation<InventoryCategoryEntity, Error, CreateCategoryDto>({
        mutationFn: createCategory,
        onSuccess: () => {
            client.invalidateQueries({ queryKey: inventoryQueryKeys.categories });
        },
    });
}

export function useDeleteInventoryCategory() {
    const client = useQueryClient();
    return useMutation<void, Error, number>({
        mutationFn: deleteCategory,
        onSuccess: () => {
            client.invalidateQueries({ queryKey: inventoryQueryKeys.categories });
        },
    });
}

// Items
export function useInventoryItems() {
    return useQuery<InventoryItemEntity[]>({
        queryKey: inventoryQueryKeys.items,
        queryFn: getItems,
    });
}

export function useCreateInventoryItem() {
    const client = useQueryClient();
    return useMutation<InventoryItemEntity, Error, CreateItemDto>({
        mutationFn: createItem,
        onSuccess: () => {
            client.invalidateQueries({ queryKey: inventoryQueryKeys.items });
        },
    });
}

export function useUpdateInventoryItem() {
    const client = useQueryClient();
    return useMutation<
        InventoryItemEntity,
        Error,
        { id: string; data: UpdateItemDto }
    >({
        mutationFn: ({ id, data }) => updateItem(id, data),
        onSuccess: () => {
            client.invalidateQueries({ queryKey: inventoryQueryKeys.items });
        },
    });
}

export function useDeleteInventoryItem() {
    const client = useQueryClient();
    return useMutation<InventoryItemEntity, Error, string>({
        mutationFn: deleteItem,
        onSuccess: () => {
            client.invalidateQueries({ queryKey: inventoryQueryKeys.items });
        },
    });
}

// Movements
export function useInventoryMovements() {
    return useQuery<InventoryMovementEntity[]>({
        queryKey: inventoryQueryKeys.movements,
        queryFn: getMovements,
    });
}

export function useCreateInventoryMovement() {
    const client = useQueryClient();
    return useMutation<InventoryMovementEntity, Error, CreateMovementDto>({
        mutationFn: createMovement,
        onSuccess: () => {
            client.invalidateQueries({ queryKey: inventoryQueryKeys.movements });
            // Creating a movement also updates items (e.g. location, status)
            client.invalidateQueries({ queryKey: inventoryQueryKeys.items });
        },
    });
}

export function useDeleteInventoryMovement() {
    const client = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: deleteMovement,
        onSuccess: () => {
            client.invalidateQueries({ queryKey: inventoryQueryKeys.movements });
        },
    });
}
