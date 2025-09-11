import { registerAs } from "@nestjs/config";
import {
  InvoiceBucketConfig,
  ResumeBucketConfig,
  ReimbursementFormBucketConfig,
  PhotoBucketConfig,
} from "common/gcp";
import { ConfigToken } from "common/config/config.constants";

export const bucketConfig = registerAs<
  InvoiceBucketConfig &
    ResumeBucketConfig &
    ReimbursementFormBucketConfig &
    PhotoBucketConfig
>(ConfigToken.BUCKET, () => {
  return {
    invoice_bucket: process.env.INVOICE_BUCKET,
    reimbursement_form_bucket: process.env.REIMBURSEMENT_FORM_BUCKET,
    resume_bucket: process.env.RESUME_BUCKET,
    photo_bucket: process.env.PHOTO_BUCKET,
  };
});
