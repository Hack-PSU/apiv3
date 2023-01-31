import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { Storage } from "common/gcp/storage";
import { Express } from "express";

@Injectable()
export class UserService {
  private get resumeBucket() {
    return admin.storage().bucket(Storage.RESUME);
  }

  private getFile(hackathonId: string, userId: string) {
    return `${hackathonId}-${userId}.pdf`;
  }

  uploadResume(hackathonId: string, userId: string, file: Express.Multer.File) {
    return this.resumeBucket
      .file(this.getFile(hackathonId, userId))
      .save(file.buffer);
  }

  deleteResume(hackathonId: string, userId: string) {
    return this.resumeBucket
      .file(this.getFile(hackathonId, userId))
      .delete({ ignoreNotFound: true });
  }
}
