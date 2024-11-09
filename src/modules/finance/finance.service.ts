import { Injectable } from "@nestjs/common";
import { InvoiceBucketConfig } from "common/gcp";
import * as admin from "firebase-admin";
import { ConfigToken } from "common/config";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class FinanceService {
    private invoiceBucketName: string;

    constructor(private readonly configService: ConfigService) {
        this.invoiceBucketName = configService.get<InvoiceBucketConfig>(
            ConfigToken.INVOICE,
        ).invoice_bucket;
    }

    private get invoiceBucket() {
        return admin.storage().bucket(this.invoiceBucketName);
    }

    private getInvoiceFileName(userId: string): string {
        return `${userId}.pdf`;
    }

    private getAuthenticatedResumeUrl(filename: string): string {
        return `https://storage.cloud.google.com/${this.invoiceBucketName}/${filename}`;
    }
}