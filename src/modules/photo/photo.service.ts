import { Injectable } from "@nestjs/common";
import { PhotoBucketConfig } from "common/gcp";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { ConfigToken } from "common/config";
import { ConfigService } from "@nestjs/config";
import { PaginatedPhotosResponse } from "./photo.types";
import * as sharp from "sharp";

@Injectable()
export class PhotoService {
  private photoBucketName: string;
  private photoCdnUrl: string;
  private readonly DERIVATIVE_WIDTHS = [480, 960, 1600];
  private readonly DERIVATIVE_FORMATS = ["webp"] as const;

  constructor(private readonly configService: ConfigService) {
    const bucketConfig = this.configService.get<PhotoBucketConfig>(
      ConfigToken.BUCKET,
    );
    this.photoBucketName = bucketConfig.photo_bucket;
    this.photoCdnUrl =
      bucketConfig.photo_cdn_url ||
      `https://storage.googleapis.com/${this.photoBucketName}`;
  }

  private get photoBucket() {
    return admin.storage().bucket(this.photoBucketName);
  }

  private getPhotoFileName(photoId: string, originalName: string): string {
    const extension = originalName.split(".").pop();
    return `${photoId}.${extension}`;
  }

  getPhotoFile(photoId: string, originalName: string) {
    return this.photoBucket.file(this.getPhotoFileName(photoId, originalName));
  }

  private getPublicPhotoUrl(filename: string): string {
    // Use CDN URL if configured, otherwise fall back to direct GCS URL
    return `${this.photoCdnUrl}/${filename}`;
  }

  private getDerivativeFilename(
    photoId: string,
    width: number,
    format: string,
  ): string {
    return `derivatives/${photoId}_w${width}.${format}`;
  }

  private getDerivativeUrls(photoId: string): Record<string, string> {
    const derivatives: Record<string, string> = {};

    for (const width of this.DERIVATIVE_WIDTHS) {
      for (const format of this.DERIVATIVE_FORMATS) {
        const filename = this.getDerivativeFilename(photoId, width, format);
        const key = `${format}_${width}`;
        derivatives[key] = this.getPublicPhotoUrl(filename);
      }
    }

    return derivatives;
  }

  private extractPhotoIdFromFilename(filename: string): string {
    // Remove extension and return photoId
    const lastDot = filename.lastIndexOf(".");
    return lastDot > -1 ? filename.substring(0, lastDot) : filename;
  }

  private async generateDerivative(
    buffer: Buffer,
    width: number,
    format: "webp",
  ): Promise<Buffer> {
    const image = sharp(buffer);

    // Automatically rotate based on EXIF orientation
    const rotatedImage = image.rotate();
    const metadata = await rotatedImage.metadata();

    // Only resize if image is wider than target width
    if (metadata.width && metadata.width > width) {
      return rotatedImage
        .resize(width, null, { withoutEnlargement: true })
        .toFormat(format, { quality: 80 })
        .toBuffer();
    }

    // If image is smaller, just convert format without resizing
    return rotatedImage.toFormat(format, { quality: 80 }).toBuffer();
  }

  private async uploadDerivatives(
    photoId: string,
    originalBuffer: Buffer,
  ): Promise<void> {
    const uploadPromises: Promise<void>[] = [];

    for (const width of this.DERIVATIVE_WIDTHS) {
      for (const format of this.DERIVATIVE_FORMATS) {
        const promise = (async () => {
          try {
            const derivativeBuffer = await this.generateDerivative(
              originalBuffer,
              width,
              format,
            );
            const filename = this.getDerivativeFilename(photoId, width, format);
            const blob = this.photoBucket.file(filename);

            await blob.save(derivativeBuffer, {
              metadata: {
                contentType: `image/${format}`,
                cacheControl: "public, max-age=31536000, immutable",
                metadata: {
                  parentPhotoId: photoId,
                  width: width.toString(),
                  format,
                },
              },
            });
          } catch (error) {
            console.error(
              `Failed to generate ${format} derivative at ${width}px for ${photoId}:`,
              error,
            );
            // Don't throw - allow upload to succeed even if some derivatives fail
          }
        })();

        uploadPromises.push(promise);
      }
    }

    // Wait for all derivatives to upload (or fail gracefully)
    await Promise.allSettled(uploadPromises);
  }

  async uploadPhoto(
    userId: string,
    fileType: string,
    file: Express.Multer.File,
  ): Promise<{
    photoId: string;
    photoUrl: string;
    derivatives: Record<string, string>;
  }> {
    const extension = file.originalname.split(".").pop() || "jpg";
    const photoId = `${userId}_${fileType}_${uuidv4()}`;
    const filename = `${photoId}.${extension}`;
    const blob = this.photoBucket.file(filename);

    // Upload original
    await blob.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        cacheControl: "public, max-age=31536000, immutable",
        metadata: {
          approvalStatus: "pending",
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Generate and upload derivatives asynchronously (don't block response)
    this.uploadDerivatives(photoId, file.buffer).catch((error) => {
      console.error(`Failed to upload derivatives for ${photoId}:`, error);
    });

    return {
      photoId,
      photoUrl: this.getPublicPhotoUrl(filename),
      derivatives: this.getDerivativeUrls(photoId),
    };
  }

  async getAllPhotos(): Promise<
    {
      name: string;
      url: string;
      createdAt: Date;
      derivatives: Record<string, string>;
    }[]
  > {
    const [files] = await this.photoBucket.getFiles();

    // Filter to only show approved photos (exclude derivatives folder)
    const approvedFiles = files.filter((file) => {
      // Skip derivative files
      if (file.name.startsWith("derivatives/")) {
        return false;
      }

      const approvalStatus = file.metadata.metadata?.approvalStatus;
      // If metadata is missing, treat as pending (backward compatibility)
      // Only show if explicitly approved
      return approvalStatus === "approved";
    });

    return approvedFiles.map((file) => {
      const photoId = this.extractPhotoIdFromFilename(file.name);
      return {
        name: file.name,
        url: this.getPublicPhotoUrl(file.name),
        createdAt: file.metadata.timeCreated
          ? new Date(file.metadata.timeCreated)
          : new Date(),
        derivatives: this.getDerivativeUrls(photoId),
      };
    });
  }

  async getAllPendingPhotos(): Promise<
    {
      name: string;
      url: string;
      createdAt: Date;
      uploadedBy: string;
      approvalStatus: string;
      derivatives: Record<string, string>;
    }[]
  > {
    const [files] = await this.photoBucket.getFiles();

    // Filter out derivative files
    const photoFiles = files.filter(
      (file) => !file.name.startsWith("derivatives/"),
    );

    // Get all photos with their approval status
    return photoFiles.map((file) => {
      const photoId = this.extractPhotoIdFromFilename(file.name);
      return {
        name: file.name,
        url: this.getPublicPhotoUrl(file.name),
        createdAt: file.metadata.timeCreated
          ? new Date(file.metadata.timeCreated)
          : new Date(),
        uploadedBy: String(file.metadata.metadata?.uploadedBy || "unknown"),
        // If metadata is missing, treat as pending (backward compatibility)
        approvalStatus: String(
          file.metadata.metadata?.approvalStatus || "pending",
        ),
        derivatives: this.getDerivativeUrls(photoId),
      };
    });
  }

  async updatePhotoApprovalStatus(
    filename: string,
    status: "approved" | "rejected",
    adminId: string,
  ): Promise<void> {
    const file = this.photoBucket.file(filename);
    const [existingMetadata] = await file.getMetadata();

    // Preserve existing metadata or create new structure
    // This handles backward compatibility for photos without metadata
    await file.setMetadata({
      metadata: {
        ...existingMetadata.metadata,
        approvalStatus: status,
        reviewedBy: adminId,
        reviewedAt: new Date().toISOString(),
        // If uploadedBy/uploadedAt are missing, set defaults for backward compatibility
        uploadedBy: existingMetadata.metadata?.uploadedBy || "unknown",
        uploadedAt:
          existingMetadata.metadata?.uploadedAt ||
          existingMetadata.timeCreated ||
          new Date().toISOString(),
      },
    });
  }

  async getPaginatedPhotos(
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<PaginatedPhotosResponse> {
    const [files] = await this.photoBucket.getFiles();

    // Filter out derivative files first
    const photoFiles = files.filter(
      (file) => !file.name.startsWith("derivatives/"),
    );

    // Filter files based on status if provided
    let filteredFiles = photoFiles;
    if (status) {
      filteredFiles = photoFiles.filter((file) => {
        const fileStatus = file.metadata.metadata?.approvalStatus || "pending";
        return fileStatus === status;
      });
    }

    // Sort files by creation date (newest first)
    filteredFiles.sort((a, b) => {
      const dateA = new Date(a.metadata.timeCreated || 0);
      const dateB = new Date(b.metadata.timeCreated || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // Calculate pagination
    const totalItems = filteredFiles.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

    // Map files to response format
    const photos = paginatedFiles.map((file) => {
      const photoId = this.extractPhotoIdFromFilename(file.name);
      return {
        name: file.name,
        url: this.getPublicPhotoUrl(file.name),
        createdAt: file.metadata.timeCreated
          ? new Date(file.metadata.timeCreated)
          : new Date(),
        uploadedBy: String(file.metadata.metadata?.uploadedBy || ""),
        approvalStatus: String(
          file.metadata.metadata?.approvalStatus || "pending",
        ),
        derivatives: this.getDerivativeUrls(photoId),
      };
    });

    return {
      photos,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  deletePhoto(photoId: string, originalName: string) {
    return this.photoBucket
      .file(this.getPhotoFileName(photoId, originalName))
      .delete({ ignoreNotFound: true });
  }
}
