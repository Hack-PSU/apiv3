import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";

import * as admin from "firebase-admin";
import { ConfigToken } from "common/config";
import { ResumeBucketConfig } from "common/gcp";

@Injectable()
export class UserService {
  private resumeBucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.resumeBucketName = configService.get<ResumeBucketConfig>(
      ConfigToken.RESUME,
    ).resume_bucket;
  }

  private get resumeBucket() {
    return admin.storage().bucket(this.resumeBucketName);
  }

  private getResumeFileName(userId: string): string {
    return `${userId}.pdf`;
  }

  private getAuthenticatedResumeUrl(filename: string): string {
    return `https://storage.cloud.google.com/${this.resumeBucketName}/${filename}`;
  }

  async uploadResume(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const filename = this.getResumeFileName(userId);
    const blob = this.resumeBucket.file(filename);
    await blob.save(file.buffer);
    return this.getAuthenticatedResumeUrl(filename);
  }

  async downloadResume(userId: string): Promise<Buffer> {
    const filename = this.getResumeFileName(userId);
    const blob = this.resumeBucket.file(filename);
    const [buffer] = await blob.download();
    return buffer;
  }

  deleteResume(userId: string) {
    return this.resumeBucket
      .file(this.getResumeFileName(userId))
      .delete({ ignoreNotFound: true });
  }
}
