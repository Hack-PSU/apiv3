import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { Express } from "express";

@Injectable()
export class EventService {
  private get eventIconBucket() {
    return admin.storage().bucket();
  }

  private get prefix() {
    return "event-icons";
  }

  private getFile(eventId: string, file: Express.Multer.File) {
    const ext = file.mimetype.split("/");
    return `${this.prefix}/${eventId}.${ext[ext.length - 1]}`;
  }

  async uploadIcon(eventId: string, file: Express.Multer.File) {
    await this.eventIconBucket
      .file(this.getFile(eventId, file))
      .save(file.buffer, { private: false });

    return this.eventIconBucket.file(this.getFile(eventId, file)).publicUrl();
  }

  async deleteIcon(eventId: string) {
    const prefix = `${this.prefix}/${eventId}`;

    const [files, ,] = await this.eventIconBucket.getFiles({
      prefix,
    });

    const filenames = files.filter((file) => file.name.startsWith(prefix));

    // remove all icons related to the eventId
    return Promise.all(
      filenames.map((file) =>
        this.eventIconBucket.file(file.name).delete({ ignoreNotFound: true }),
      ),
    );
  }
}
