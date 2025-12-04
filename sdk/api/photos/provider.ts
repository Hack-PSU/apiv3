import { apiFetch } from "../apiClient";
import {
	PaginatedPhotosResponse,
	PhotoEntity,
	PhotoUploadResponse,
} from "./entity";

export async function uploadPhoto(
	file: File,
	fileType?: string,
): Promise<PhotoUploadResponse> {
	const formData = new FormData();
	formData.append("photo", file);
	if (fileType) {
		formData.append("fileType", fileType);
	}

	return await apiFetch<PhotoUploadResponse>("photos/upload", {
		method: "POST",
		body: formData,
	});
}

export async function getAllPhotos(): Promise<PhotoEntity[]> {
	return await apiFetch<PhotoEntity[]>("photos");
}

export async function getPaginatedPhotos(
	page: number = 1,
	limit: number = 10,
	status?: string,
): Promise<PaginatedPhotosResponse> {
	const params = new URLSearchParams({
		page: page.toString(),
		limit: limit.toString(),
	});
	if (status) {
		params.append("status", status);
	}
	return await apiFetch<PaginatedPhotosResponse>(
		`photos/paginated?${params.toString()}`,
	);
}

export async function getAllPendingPhotos(): Promise<PhotoEntity[]> {
	return await apiFetch<PhotoEntity[]>("photos/pending");
}

export async function approvePhoto(filename: string): Promise<{ message: string }> {
	return await apiFetch<{ message: string }>(`photos/${filename}/approve`, {
		method: "PATCH",
	});
}

export async function rejectPhoto(filename: string): Promise<{ message: string }> {
	return await apiFetch<{ message: string }>(`photos/${filename}/reject`, {
		method: "PATCH",
	});
}

export async function deletePhoto(
	photoId: string,
	originalName: string,
): Promise<void> {
	const params = new URLSearchParams({ originalName });
	return await apiFetch<void>(`photos/${photoId}?${params.toString()}`, {
		method: "DELETE",
	});
}
