import { registerAs } from "@nestjs/config";
import {
  InvoiceBucketConfig,
  ResumeBucketConfig,
  ReimbursementFormBucketConfig,
  PhotoBucketConfig,
} from "common/gcp";
import { ConfigToken } from "common/config/config.constants";

export type DriveRootFolderConfig = {
  drive_root_folder?: string;
};

export const bucketConfig = registerAs<
  InvoiceBucketConfig &
    ResumeBucketConfig &
    ReimbursementFormBucketConfig &
    PhotoBucketConfig &
    DriveRootFolderConfig
>(ConfigToken.BUCKET, () => {
  return {
    invoice_bucket: process.env.INVOICE_BUCKET,
    reimbursement_form_bucket: process.env.REIMBURSEMENT_FORM_BUCKET,
    resume_bucket: process.env.RESUME_BUCKET,
    photo_bucket: process.env.PHOTO_BUCKET,
    photo_cdn_url: process.env.PHOTO_CDN_URL,
    drive_root_folder: process.env.DRIVE_ROOT_FOLDER,
  };
});
