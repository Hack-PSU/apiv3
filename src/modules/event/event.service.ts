import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { Express } from "express";
import * as mime from "mime-types";

@Injectable()
export class EventService {
  private get eventIconBucket() {
    return admin.storage().bucket();
  }

  private get prefix() {
    return "event-icons";
  }

  private getFile(eventId: string, file: Express.Multer.File) {
    let ext = mime.extension(file.mimetype);

    if (!ext) {
      ext = file.mimetype.split("/");
      ext = ext[ext.length - 1];
    }

    return `${this.prefix}/${eventId}.${ext}`;
  }

  async uploadIcon(eventId: string, file: Express.Multer.File) {
    const blob = this.eventIconBucket.file(this.getFile(eventId, file));

    await blob.save(file.buffer, { private: false, public: true });

    await blob.makePublic();

    return blob.publicUrl();
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
