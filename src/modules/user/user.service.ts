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
    if (process.env.NODE_ENV && process.env.NODE_ENV == "staging") {
      return admin.storage().bucket();
    } else {
      return admin.storage().bucket(this.resumeBucketName);
    }
  }

  private get prefix() {
    if (process.env.NODE_ENV && process.env.NODE_ENV == "staging") {
      return "resumes/";
    } else {
      return "";
    }
  }

  private getResumeFileName(userId: string): string {
    return `${this.prefix}${userId}.pdf`;
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

  deleteResume(userId: string) {
    return this.resumeBucket
      .file(this.getResumeFileName(userId))
      .delete({ ignoreNotFound: true });
  }
}
