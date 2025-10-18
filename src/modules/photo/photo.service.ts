import { Injectable } from "@nestjs/common";
import { PhotoBucketConfig } from "common/gcp";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { ConfigToken } from "common/config";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PhotoService {
  private photoBucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.photoBucketName = this.configService.get<PhotoBucketConfig>(
      ConfigToken.BUCKET,
    ).photo_bucket;
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
    return `https://storage.googleapis.com/${this.photoBucketName}/${filename}`;
  }

  async uploadPhoto(
    userId: string,
    fileType: string,
    file: Express.Multer.File,
  ): Promise<{ photoId: string; photoUrl: string }> {
    const extension = file.originalname.split(".").pop() || "jpg";
    const photoId = `${userId}_${fileType}_${uuidv4()}`;
    const filename = `${photoId}.${extension}`;
    const blob = this.photoBucket.file(filename);

    await blob.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          approvalStatus: "pending",
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    return { photoId, photoUrl: this.getPublicPhotoUrl(filename) };
  }

  async getAllPhotos(): Promise<
    { name: string; url: string; createdAt: Date }[]
  > {
    const [files] = await this.photoBucket.getFiles();

    // Filter to only show approved photos
    const approvedFiles = files.filter((file) => {
      const approvalStatus = file.metadata.metadata?.approvalStatus;
      // If metadata is missing, treat as pending (backward compatibility)
      // Only show if explicitly approved
      return approvalStatus === "approved";
    });

    return approvedFiles.map((file) => ({
      name: file.name,
      url: this.getPublicPhotoUrl(file.name),
      createdAt: file.metadata.timeCreated
        ? new Date(file.metadata.timeCreated)
        : new Date(),
    }));
  }

  async getAllPendingPhotos(): Promise<
    {
      name: string;
      url: string;
      createdAt: Date;
      uploadedBy: string;
      approvalStatus: string;
    }[]
  > {
    const [files] = await this.photoBucket.getFiles();

    // Get all photos with their approval status
    return files.map((file) => ({
      name: file.name,
      url: this.getPublicPhotoUrl(file.name),
      createdAt: file.metadata.timeCreated
        ? new Date(file.metadata.timeCreated)
        : new Date(),
      uploadedBy: String(file.metadata.metadata?.uploadedBy || "unknown"),
      // If metadata is missing, treat as pending (backward compatibility)
      approvalStatus: String(file.metadata.metadata?.approvalStatus || "pending"),
    }));
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
        uploadedAt: existingMetadata.metadata?.uploadedAt || existingMetadata.timeCreated || new Date().toISOString(),
      },
    });
  }
}
