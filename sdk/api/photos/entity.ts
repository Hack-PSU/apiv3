export interface PhotoEntity {
	name: string;
	url: string;
	createdAt: string;
	uploadedBy?: string;
	approvalStatus?: string;
	derivatives?: Record<string, string>;
}

export interface PhotoUploadResponse {
	photoId: string;
	photoUrl: string;
	derivatives: Record<string, string>;
}

export interface PaginatedPhotosResponse {
	photos: PhotoEntity[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
		hasNext: boolean;
		hasPrevious: boolean;
	};
}
