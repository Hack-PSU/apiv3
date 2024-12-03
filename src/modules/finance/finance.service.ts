import { Injectable } from "@nestjs/common";
import { InvoiceBucketConfig } from "common/gcp";
import * as admin from "firebase-admin";
import { ConfigToken } from "common/config";
import { ConfigService } from "@nestjs/config";
import { PDFDocument } from "pdf-lib";
import { writeFile } from "fs/promises";

const CloudStorageFinance = "finance-template";

type BoolKeys =
  | "UNRESTRICTED  30"
  | "UPAC allocated Funds 10"
  | "ACTIVITY FEE  40"
  | "Summer Allocation";

type IntKeys =
  | "ORGACCT"
  | "TOTAL"
  | "FS1"
  | "FS2"
  | "FS3"
  | "FS4"
  | "Amount 1"
  | "Amount 2"
  | "Amount 3"
  | "Amount 4";

type StringKeys =
  | "ACTIVITY CODE if applicable"
  | "ORGANIZATION"
  | "PAYEE please print clearly"
  | "MAILING ADDRESS If applicable 1"
  | "MAILING ADDRESS If applicable 2"
  | "MAILING ADDRESS If applicable 3"
  | "EMAIL"
  | "Description 1"
  | "Description 2"
  | "Description 3"
  | "Description 4"
  | "Object Code 1"
  | "Object Code 2"
  | "Object code 3"
  | "Object Code 4"
  | "Clear"
  | "Print"
  | "Today's Date 1_af_date";

type RadioKeys = "Group1";

interface PDFEntity
  extends Partial<Record<BoolKeys, boolean>>,
    Partial<Record<IntKeys, number>>,
    Partial<Record<StringKeys, string>>,
    Partial<Record<RadioKeys, string>> {}

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

  private getAuthenticatedReceiptUrl(filename: string): string {
    return `https://storage.cloud.google.com/${this.invoiceBucketName}/${filename}`;
  }

  async uploadReceipt(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const filename = this.getInvoiceFileName(userId);
    const blob = this.invoiceBucket.file(filename);
    await blob.save(file.buffer);
    return this.getAuthenticatedReceiptUrl(filename);
  }

  private file(filepath: string) {
    return admin.storage().bucket().file(`${CloudStorageFinance}${filepath}`);
  }

  async fetchTemplate(template: string) {
    return this.file(`/${template}.pdf`).download();
  }

  async populateTemplate(
    filename: string,
    data: PDFEntity,
    id: string,
  ): Promise<Uint8Array> {
    const pdfDocBytes = await this.fetchTemplate(filename);

    const pdfDoc = await PDFDocument.load(pdfDocBytes[0]);

    const form = pdfDoc.getForm();

    const fields = form.getFields();

    fields.forEach((field) => {
      console.log(field.getName());
    });

    for (const key in data) {
      if (key === "Group1") {
        if (form.getRadioGroup(key)) {
          form.getRadioGroup(key).select(data[key]);
        }
      } else if (typeof data[key] === "string") {
        if (form.getTextField(key)) {
          form.getTextField(key).setText(data[key]);
        }
      } else if (typeof data[key] === "number") {
        if (form.getTextField(key)) {
          form.getTextField(key).setText(data[key].toString());
        }
      } else if (typeof data[key] === "boolean") {
        if (form.getCheckBox(key)) {
          form.getCheckBox(key).check();
        }
      }
    }

    // rename the file
    pdfDoc.setTitle(id);
    const pdfBytes = await pdfDoc.save();

    return pdfBytes;
  }
}
