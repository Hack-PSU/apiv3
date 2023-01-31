import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { Express } from "express";

@Injectable()
export class EventService {
  private get eventIconBucket() {
    return admin.storage().bucket();
  }

  private getFile(eventId: string) {
    return `event-icons/${eventId}`;
  }

  async uploadIcon(eventId: string, file: Express.Multer.File) {
    await this.eventIconBucket
      .file(this.getFile(eventId))
      .save(file.buffer, { private: false });

    return this.eventIconBucket.file(this.getFile(eventId)).publicUrl();
  }

  async deleteIcon(eventId: string) {
    return this.eventIconBucket
      .file(this.getFile(eventId))
      .delete({ ignoreNotFound: true });
  }
}
