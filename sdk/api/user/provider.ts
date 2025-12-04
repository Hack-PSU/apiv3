import { apiFetch } from "../apiClient";
import {
	UserEntity,
	UserProfileResponse,
	UserRegisterRequest,
	UserCheckInRequest,
} from "./entity";

export async function getAllUsers(active?: boolean): Promise<UserEntity[]> {
	const queryParam = active !== undefined ? `?active=${active}` : "";
	return apiFetch<UserEntity[]>(`/users${queryParam}`, { method: "GET" });
}

export async function getUser(id: string): Promise<UserEntity> {
	return apiFetch<UserEntity>(`/users/${id}`, { method: "GET" });
}

export async function getMyInfo(): Promise<UserProfileResponse> {
	return apiFetch<UserProfileResponse>("/users/info/me", { method: "GET" });
}

export async function createUser(
	data: Omit<UserEntity, "id" | "resume">,
	resume?: File
): Promise<UserEntity> {
	const formData = new FormData();
	Object.entries(data).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			formData.append(key, String(value));
		}
	});
	if (resume) {
		formData.append("resume", resume);
	}

	return apiFetch<UserEntity>("/users", {
		method: "POST",
		body: formData,
	});
}

export async function updateUser(
	id: string,
	data: Partial<Omit<UserEntity, "id" | "resume">>,
	resume?: File
): Promise<UserEntity> {
	const formData = new FormData();
	Object.entries(data).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			formData.append(key, String(value));
		}
	});
	if (resume) {
		formData.append("resume", resume);
	}

	return apiFetch<UserEntity>(`/users/${id}`, {
		method: "PATCH",
		body: formData,
	});
}

export async function replaceUser(
	id: string,
	data: Omit<UserEntity, "id" | "resume">,
	resume?: File
): Promise<UserEntity> {
	const formData = new FormData();
	Object.entries(data).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			formData.append(key, String(value));
		}
	});
	if (resume) {
		formData.append("resume", resume);
	}

	return apiFetch<UserEntity>(`/users/${id}`, {
		method: "PUT",
		body: formData,
	});
}

export async function deleteUser(id: string): Promise<void> {
	return apiFetch<void>(`/users/${id}`, { method: "DELETE" });
}

export async function getUserResume(id: string): Promise<Blob> {
	return apiFetch<Blob>(`/users/${id}/resumes`, {
		method: "GET",
	});
}

export async function getAllResumes(): Promise<Blob> {
	return apiFetch<Blob>("/users/resumes", {
		method: "GET",
	});
}

export async function registerUser(
	id: string,
	data: UserRegisterRequest
): Promise<any> {
	return apiFetch<any>(`/users/${id}/register`, {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function checkInUser(
	userId: string,
	eventId: string,
	data: UserCheckInRequest
): Promise<void> {
	return apiFetch<void>(`/users/${userId}/check-in/event/${eventId}`, {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function getUserExtraCreditClasses(userId: string): Promise<any[]> {
	return apiFetch<any[]>(`/users/${userId}/extra-credit/classes`, {
		method: "GET",
	});
}

export async function assignExtraCreditClass(
	userId: string,
	classId: number
): Promise<any> {
	return apiFetch<any>(`/users/${userId}/extra-credit/assign/${classId}`, {
		method: "POST",
	});
}

export async function unassignExtraCreditClass(
	userId: string,
	classId: number
): Promise<void> {
	return apiFetch<void>(`/users/${userId}/extra-credit/unassign/${classId}`, {
		method: "POST",
	});
}

export async function exportUsersData(): Promise<any[]> {
	return apiFetch<any[]>("/users/export/data", {
		method: "GET",
	});
}
