import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { Express } from "express";
import * as mime from "mime-types";

type SponsorData = { id: number; name: string };

@Injectable()
export class SponsorService {
  private get sponsorBucket() {
    return admin.storage().bucket();
  }

  private get prefix() {
    return "sponsor-logos";
  }

  private getFilename(sponsor: SponsorData, variant: "light" | "dark") {
    return `${sponsor.id}-${sponsor.name}-${variant}`;
  }

  private getFile(
    sponsor: SponsorData,
    file: Express.Multer.File,
    variant: "light" | "dark",
  ) {
    let ext = mime.extension(file.mimetype);

    if (!ext) {
      ext = file.mimetype.split("/");
      ext = ext[ext.length - 1];
    }

    return `${this.prefix}/${this.getFilename(sponsor, variant)}.${ext}`;
  }

  async uploadLogo(
    sponsor: SponsorData,
    file: Express.Multer.File,
    variant: "light" | "dark",
  ) {
    const blob = this.sponsorBucket.file(this.getFile(sponsor, file, variant));

    await blob.save(file.buffer, { public: true });

    await blob.makePublic();

    return blob.publicUrl();
  }

  async deleteLogo(sponsor: SponsorData, variant: "light" | "dark") {
    const prefix = `${this.prefix}/${this.getFilename(sponsor, variant)}`;
    const [files, ,] = await this.sponsorBucket.getFiles({ prefix });

    const filenames = files.filter((file) => file.name.startsWith(prefix));

    return Promise.all(
      filenames.map((file) =>
        this.sponsorBucket.file(file.name).delete({ ignoreNotFound: true }),
      ),
    );
  }
}
