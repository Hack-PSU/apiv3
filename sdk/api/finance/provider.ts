import { apiFetch } from "../apiClient";
import {
	FinanceEntity,
	FinancePatchEntity,
	FinanceStatusPatchEntity,
} from "./entity";

export async function getAllFinances(): Promise<FinanceEntity[]> {
	return apiFetch<FinanceEntity[]>("/finances", { method: "GET" });
}

export async function getFinance(id: string): Promise<FinanceEntity> {
	return apiFetch<FinanceEntity>(`/finances/${id}`, { method: "GET" });
}

export async function createFinance(data: FormData): Promise<FinanceEntity> {
	return apiFetch<FinanceEntity>("/finances", {
		method: "POST",
		body: data,
	});
}

export async function updateFinanceStatus(
	id: string,
	data: FinanceStatusPatchEntity
): Promise<FinanceEntity> {
	return apiFetch<FinanceEntity>(`/finances/${id}/status`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
}

export async function updateFinance(
	id: string,
	data: FinancePatchEntity
): Promise<FinanceEntity> {
	return apiFetch<FinanceEntity>(`/finances/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
}
