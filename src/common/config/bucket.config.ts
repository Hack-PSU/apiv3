import { registerAs } from "@nestjs/config";
import {
  InvoiceBucketConfig,
  ResumeBucketConfig,
  ReimbursementFormBucketConfig,
} from "common/gcp";
import { ConfigToken } from "common/config/config.constants";

export const bucketConfig = registerAs<
  InvoiceBucketConfig & ResumeBucketConfig & ReimbursementFormBucketConfig
>(ConfigToken.BUCKET, () => {
  return {
    invoice_bucket: process.env.INVOICE_BUCKET,
    reimbursement_form_bucket: process.env.REIMBURSEMENT_FORM_BUCKET,
    resume_bucket: process.env.RESUME_BUCKET,
  };
});
