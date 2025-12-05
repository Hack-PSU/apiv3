import { apiFetch } from "../apiClient";
import {
	DrivePermission,
	DriveFolderInfo,
	DriveSubfolder,
	DriveCreateFolderRequest,
	DriveShareFolderRequest,
	DriveCreateFolderStructureRequest,
	DriveShareMultipleRequest,
} from "./entity";

export async function getFolderPermissions(
	folderId: string
): Promise<DrivePermission[]> {
	return apiFetch<DrivePermission[]>(
		`/drive/folder/${folderId}/permissions`,
		{ method: "GET" }
	);
}

export async function getFolderInfo(
	folderId: string
): Promise<DriveFolderInfo> {
	return apiFetch<DriveFolderInfo>(`/drive/folder/${folderId}/info`, {
		method: "GET",
	});
}

export async function listSubfolders(
	folderId: string
): Promise<DriveSubfolder[]> {
	return apiFetch<DriveSubfolder[]>(`/drive/folder/${folderId}/subfolders`, {
		method: "GET",
	});
}

export async function createFolder(
	data: DriveCreateFolderRequest
): Promise<any> {
	return apiFetch<any>("/drive/folder/create", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function shareFolder(
	folderId: string,
	data: DriveShareFolderRequest
): Promise<any> {
	return apiFetch<any>(`/drive/folder/${folderId}/share`, {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function createFolderStructure(
	data: DriveCreateFolderStructureRequest
): Promise<any> {
	return apiFetch<any>("/drive/folder/create-structure", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function shareFolderWithMultiple(
	folderId: string,
	data: DriveShareMultipleRequest
): Promise<any> {
	return apiFetch<any>(`/drive/folder/${folderId}/share-multiple`, {
		method: "POST",
		body: JSON.stringify(data),
	});
}
