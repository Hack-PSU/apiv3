import { registerAs } from "@nestjs/config";
import { InvoiceBucketConfig } from "common/gcp";
import { ConfigToken } from "common/config/config.constants";

export const invoiceBucketConfig = registerAs<InvoiceBucketConfig>(
    ConfigToken.INVOICE,
    () => {
        return {
            invoice_bucket: process.env.INVOICE_BUCKET,
        };
    },
);
