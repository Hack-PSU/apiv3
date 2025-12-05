import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getFolderPermissions,
	getFolderInfo,
	listSubfolders,
	createFolder,
	shareFolder,
	createFolderStructure,
	shareFolderWithMultiple,
} from "./provider";
import {
	DrivePermission,
	DriveFolderInfo,
	DriveSubfolder,
	DriveCreateFolderRequest,
	DriveShareFolderRequest,
	DriveCreateFolderStructureRequest,
	DriveShareMultipleRequest,
} from "./entity";

export const driveQueryKeys = {
	folderPermissions: (folderId: string) =>
		["drive", "folder", folderId, "permissions"] as const,
	folderInfo: (folderId: string) =>
		["drive", "folder", folderId, "info"] as const,
	subfolders: (folderId: string) =>
		["drive", "folder", folderId, "subfolders"] as const,
};

export function useFolderPermissions(folderId: string) {
	return useQuery<DrivePermission[]>({
		queryKey: driveQueryKeys.folderPermissions(folderId),
		queryFn: () => getFolderPermissions(folderId),
		enabled: Boolean(folderId),
	});
}

export function useFolderInfo(folderId: string) {
	return useQuery<DriveFolderInfo>({
		queryKey: driveQueryKeys.folderInfo(folderId),
		queryFn: () => getFolderInfo(folderId),
		enabled: Boolean(folderId),
	});
}

export function useSubfolders(folderId: string) {
	return useQuery<DriveSubfolder[]>({
		queryKey: driveQueryKeys.subfolders(folderId),
		queryFn: () => listSubfolders(folderId),
		enabled: Boolean(folderId),
	});
}

export function useCreateFolder() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: DriveCreateFolderRequest) => createFolder(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["drive", "folder"] });
		},
	});
}

export function useShareFolder() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			folderId,
			data,
		}: {
			folderId: string;
			data: DriveShareFolderRequest;
		}) => shareFolder(folderId, data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: driveQueryKeys.folderPermissions(variables.folderId),
			});
			queryClient.invalidateQueries({
				queryKey: driveQueryKeys.folderInfo(variables.folderId),
			});
		},
	});
}

export function useCreateFolderStructure() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: DriveCreateFolderStructureRequest) =>
			createFolderStructure(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["drive", "folder"] });
		},
	});
}

export function useShareFolderWithMultiple() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			folderId,
			data,
		}: {
			folderId: string;
			data: DriveShareMultipleRequest;
		}) => shareFolderWithMultiple(folderId, data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: driveQueryKeys.folderPermissions(variables.folderId),
			});
			queryClient.invalidateQueries({
				queryKey: driveQueryKeys.folderInfo(variables.folderId),
			});
		},
	});
}
