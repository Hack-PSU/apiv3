export interface PhotoItem {
  name: string;
  url: string;
  createdAt: Date;
  uploadedBy?: string;
  approvalStatus?: string;
  derivatives?: Record<string, string>;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedPhotosResponse {
  photos: PhotoItem[];
  pagination: PaginationMeta;
}
