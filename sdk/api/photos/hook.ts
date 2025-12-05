import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	approvePhoto,
	deletePhoto,
	getAllPendingPhotos,
	getAllPhotos,
	getPaginatedPhotos,
	rejectPhoto,
	uploadPhoto,
} from "./provider";
import {
	PaginatedPhotosResponse,
	PhotoEntity,
	PhotoUploadResponse,
} from "./entity";

export const photoQueryKeys = {
	all: ["photos"] as const,
	paginated: (page: number, limit: number, status?: string) =>
		["photos", "paginated", page, limit, status] as const,
	pending: ["photos", "pending"] as const,
};

export function useUploadPhoto() {
	const client = useQueryClient();
	return useMutation<
		PhotoUploadResponse,
		Error,
		{ file: File; fileType?: string }
	>({
		mutationFn: ({ file, fileType }) => uploadPhoto(file, fileType),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: photoQueryKeys.all });
			client.invalidateQueries({ queryKey: ["photos", "paginated"] });
			client.invalidateQueries({ queryKey: photoQueryKeys.pending });
		},
	});
}

export function useAllPhotos() {
	return useQuery<PhotoEntity[]>({
		queryKey: photoQueryKeys.all,
		queryFn: getAllPhotos,
	});
}

export function usePaginatedPhotos(
	page: number = 1,
	limit: number = 10,
	status?: string,
) {
	return useQuery<PaginatedPhotosResponse>({
		queryKey: photoQueryKeys.paginated(page, limit, status),
		queryFn: () => getPaginatedPhotos(page, limit, status),
	});
}

export function usePendingPhotos() {
	return useQuery<PhotoEntity[]>({
		queryKey: photoQueryKeys.pending,
		queryFn: getAllPendingPhotos,
	});
}

export function useApprovePhoto() {
	const client = useQueryClient();
	return useMutation<{ message: string }, Error, string>({
		mutationFn: approvePhoto,
		onSuccess: () => {
			client.invalidateQueries({ queryKey: photoQueryKeys.all });
			client.invalidateQueries({ queryKey: ["photos", "paginated"] });
			client.invalidateQueries({ queryKey: photoQueryKeys.pending });
		},
	});
}

export function useRejectPhoto() {
	const client = useQueryClient();
	return useMutation<{ message: string }, Error, string>({
		mutationFn: rejectPhoto,
		onSuccess: () => {
			client.invalidateQueries({ queryKey: photoQueryKeys.all });
			client.invalidateQueries({ queryKey: ["photos", "paginated"] });
			client.invalidateQueries({ queryKey: photoQueryKeys.pending });
		},
	});
}

export function useDeletePhoto() {
	const client = useQueryClient();
	return useMutation<void, Error, { photoId: string; originalName: string }>({
		mutationFn: ({ photoId, originalName }) => deletePhoto(photoId, originalName),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: photoQueryKeys.all });
			client.invalidateQueries({ queryKey: ["photos", "paginated"] });
			client.invalidateQueries({ queryKey: photoQueryKeys.pending });
		},
	});
}
