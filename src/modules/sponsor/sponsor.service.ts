import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { Express } from "express";

type SponsorData = { id: number; name: string };

@Injectable()
export class SponsorService {
  private get sponsorBucket() {
    return admin.storage().bucket();
  }

  private get prefix() {
    return "sponsor-logos";
  }

  private getFilename(sponsor: SponsorData) {
    return `${sponsor.id}-${sponsor.name}`;
  }

  private getFile(sponsor: SponsorData, file: Express.Multer.File) {
    const ext = file.mimetype.split("/");
    return `${this.prefix}/${this.getFilename(sponsor)}.${ext[ext.length - 1]}`;
  }

  async uploadLogo(sponsor: SponsorData, file: Express.Multer.File) {
    await this.sponsorBucket
      .file(this.getFile(sponsor, file))
      .save(file.buffer, { public: true });

    return this.sponsorBucket.file(this.getFile(sponsor, file)).publicUrl();
  }

  async deleteLogo(sponsor: SponsorData) {
    const prefix = `${this.prefix}/${this.getFilename(sponsor)}`;
    const [files, ,] = await this.sponsorBucket.getFiles({ prefix });

    const filenames = files.filter((file) => file.name.startsWith(prefix));

    return Promise.all(
      filenames.map((file) =>
        this.sponsorBucket.file(file.name).delete({ ignoreNotFound: true }),
      ),
    );
  }
}
