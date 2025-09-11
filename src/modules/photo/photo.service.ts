import { Injectable } from "@nestjs/common";
import { PhotoBucketConfig } from "common/gcp";
import * as admin from "firebase-admin";
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
    photoId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const filename = this.getPhotoFileName(photoId, file.originalname);
    const blob = this.photoBucket.file(filename);

    await blob.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
      public: true,
    });

    // Make the file publicly accessible
    await blob.makePublic();

    return this.getPublicPhotoUrl(filename);
  }

  async getAllPhotos(): Promise<
    { name: string; url: string; createdAt: Date }[]
  > {
    const [files] = await this.photoBucket.getFiles();

    return files.map((file) => ({
      name: file.name,
      url: this.getPublicPhotoUrl(file.name),
      createdAt: file.metadata.timeCreated
        ? new Date(file.metadata.timeCreated)
        : new Date(),
    }));
  }
}
