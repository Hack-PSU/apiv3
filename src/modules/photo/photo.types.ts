import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Declared as classes rather than interfaces so Swagger can describe them.
 * Interfaces are erased at compile time and cannot carry @ApiProperty, which is
 * why these responses were previously documented with hand-written inline
 * schemas that drifted from what the service returns.
 */
export class PhotoItem {
  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ format: "date-time", type: String })
  createdAt: Date;

  @ApiPropertyOptional()
  uploadedBy?: string;

  @ApiPropertyOptional()
  approvalStatus?: string;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: { type: "string" },
    description:
      "Responsive image URLs keyed by variant, such as webp_480 or webp_1600",
  })
  derivatives?: Record<string, string>;
}

export class PaginationMeta {
  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrevious: boolean;
}

export class PaginatedPhotosResponse {
  @ApiProperty({ type: [PhotoItem] })
  photos: PhotoItem[];

  @ApiProperty({ type: PaginationMeta })
  pagination: PaginationMeta;
}

export class UploadPhotoResponse {
  @ApiProperty()
  photoId: string;

  @ApiProperty()
  photoUrl: string;

  @ApiProperty({
    type: "object",
    additionalProperties: { type: "string" },
    description: "Responsive image URLs keyed by variant",
  })
  derivatives: Record<string, string>;
}

export class UploadPhotoBody {
  @ApiProperty({
    type: "string",
    format: "binary",
    description: "The image to upload",
  })
  photo: any;

  @ApiPropertyOptional({ description: "Explicit MIME type for the upload" })
  fileType?: string;
}
