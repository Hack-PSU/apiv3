import { registerAs } from "@nestjs/config";
import { ReimbursementFormBucketConfig } from "common/gcp";
import { ConfigToken } from "common/config/config.constants";

export const reimbursementFormBucketConfig =
  registerAs<ReimbursementFormBucketConfig>(
    ConfigToken.REIMBURSEMENT_FORM,
    () => {
      return {
        reimbursement_form_bucket: process.env.REIMBURSEMENT_FORM_BUCKET,
      };
    },
  );
