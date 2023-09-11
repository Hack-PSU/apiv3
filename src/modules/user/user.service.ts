import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { StorageEnums } from "common/gcp/storage";
import { Express } from "express";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class UserService {
  constructor(private readonly configService: ConfigService) {}

  private get resumeBucket() {
    if (process.env.NODE_ENV && process.env.NODE_ENV == "staging") {
      return admin.storage().bucket();
    } else {
      return admin.storage().bucket(StorageEnums.RESUME);
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
    return `https://storage.cloud.google.com/${StorageEnums.RESUME}/${filename}`;
  }

  async uploadResume(userId: string, file: Express.Multer.File): Promise<string> {
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
