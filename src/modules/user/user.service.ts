import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { Storage } from "common/gcp/storage";
import { Express } from "express";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class UserService {
  constructor(private readonly configService: ConfigService) {}

  private get resumeBucket() {
    if (this.configService.get("GOOGLE_CERT")) {
      // is staging
      return admin.storage().bucket();
    } else {
      return admin.storage().bucket(Storage.RESUME);
    }
  }

  private get prefix() {
    if (this.configService.get("GOOGLE_CERT")) {
      return "resumes/";
    } else {
      return "";
    }
  }

  private getFile(userId: string) {
    return `${this.prefix}${userId}.pdf`;
  }

  async uploadResume(userId: string, file: Express.Multer.File) {
    const blob = this.resumeBucket.file(this.getFile(userId));

    await blob.save(file.buffer);

    await blob.makePublic();

    return blob.publicUrl();
  }

  deleteResume(userId: string) {
    return this.resumeBucket
      .file(this.getFile(userId))
      .delete({ ignoreNotFound: true });
  }
}
