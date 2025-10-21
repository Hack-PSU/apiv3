import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";

import * as admin from "firebase-admin";
import { ConfigToken } from "common/config";
import { ResumeBucketConfig } from "common/gcp";
import * as archiver from "archiver";
import { User } from "entities/user.entity";

@Injectable()
export class UserService {
  private resumeBucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.resumeBucketName = configService.get<ResumeBucketConfig>(
      ConfigToken.BUCKET,
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

  async downloadAllResumes(
    allowedUserIds: Set<string>,
  ): Promise<archiver.Archiver> {
    const bucket = admin.storage().bucket(this.resumeBucketName);
    const [files] = await bucket.getFiles();
    const zip = archiver("zip");

    files
      .filter((file) => {
        const id = file.name.replace(/\.pdf$/i, "");
        return allowedUserIds.has(id);
      })
      .forEach((file) =>
        zip.append(file.createReadStream(), { name: file.name }),
      );

    zip.finalize();
    return zip;
  }

  async getUsersRegistrationData(): Promise<any[]> {
    // Execute raw SQL query to join users and registrations for active hackathon only
    const results = await User.knex().raw(`
      SELECT 
        users.first_name, 
        users.last_name, 
        users.email,
        users.phone, 
        registrations.age, 
        users.country, 
        users.university, 
        registrations.academic_year, 
        registrations.mlh_coc, 
        registrations.mlh_dcp, 
        registrations.share_address_mlh, 
        registrations.share_address_sponsors, 
        registrations.share_email_mlh, 
        registrations.driving, 
        registrations.travel_reimbursement, 
        registrations.first_hackathon 
      FROM users 
      JOIN registrations ON registrations.user_id = users.id
      JOIN hackathons ON registrations.hackathon_id = hackathons.id
      WHERE hackathons.active = true
    `);

    // Return the data array (MySQL returns results in first element)
    return results[0] || [];
  }
}
