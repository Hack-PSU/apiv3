import { apiFetch } from "../apiClient";
import {
	OrganizerEntity,
	OrganizerProjectScore,
	OrganizerProjectReassign,
} from "./entity";

export async function getAllOrganizers(): Promise<OrganizerEntity[]> {
	return apiFetch<OrganizerEntity[]>("/organizers", { method: "GET" });
}

export async function getOrganizer(id: string): Promise<OrganizerEntity> {
	return apiFetch<OrganizerEntity>(`/organizers/${id}`, { method: "GET" });
}

export async function createOrganizer(
	data: Omit<OrganizerEntity, "id" | "isActive">
): Promise<OrganizerEntity> {
	return apiFetch<OrganizerEntity>("/organizers", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function updateOrganizer(
	id: string,
	data: Partial<Omit<OrganizerEntity, "id" | "isActive">>
): Promise<OrganizerEntity> {
	return apiFetch<OrganizerEntity>(`/organizers/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
}

export async function replaceOrganizer(
	id: string,
	data: Omit<OrganizerEntity, "id" | "isActive">
): Promise<OrganizerEntity> {
	return apiFetch<OrganizerEntity>(`/organizers/${id}`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
}

export async function deleteOrganizer(id: string): Promise<void> {
	return apiFetch<void>(`/organizers/${id}`, { method: "DELETE" });
}

export async function resendAllVerificationEmails(): Promise<{
	message: string;
}> {
	return apiFetch<{ message: string }>("/organizers/resend-verification", {
		method: "POST",
	});
}

export async function getOrganizerScans(id: string): Promise<any> {
	return apiFetch<any>(`/organizers/${id}/scans`, { method: "GET" });
}

export async function getOrganizerJudgingProjects(
	id: string
): Promise<OrganizerProjectScore[]> {
	return apiFetch<OrganizerProjectScore[]>(
		`/organizers/${id}/judging/projects`,
		{ method: "GET" }
	);
}

export async function updateOrganizerProjectScore(
	id: string,
	projectId: number,
	data: {
		creativity?: number;
		technical?: number;
		implementation?: number;
		clarity?: number;
		growth?: number;
		challenge1?: number;
		challenge2?: number;
		challenge3?: number;
		submitted?: boolean;
	}
): Promise<any> {
	return apiFetch<any>(`/organizers/${id}/judging/projects/${projectId}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
}

export async function deleteOrganizerProjectAndReassign(
	id: string,
	projectId: number,
	data: OrganizerProjectReassign
): Promise<void> {
	return apiFetch<void>(`/organizers/${id}/judging/projects/${projectId}`, {
		method: "DELETE",
		body: JSON.stringify(data),
	});
}
