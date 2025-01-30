import { Injectable } from "@nestjs/common";
import { InvoiceBucketConfig, ReimbursementFormBucketConfig } from "common/gcp";
import * as admin from "firebase-admin";
import { ConfigToken } from "common/config";
import { ConfigService } from "@nestjs/config";
import { PDFDocument } from "pdf-lib";
import {
  ReimbursementForm,
  ReimbursementFormMappings,
} from "./reimbursement-form";

const CloudStorageFinance = "finance-template";

@Injectable()
export class FinanceService {
  private invoiceBucketName: string;
  private reimbursementFormBucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.invoiceBucketName = this.configService.get<InvoiceBucketConfig>(
      ConfigToken.INVOICE,
    ).invoice_bucket;

    this.reimbursementFormBucketName =
      this.configService.get<ReimbursementFormBucketConfig>(
        ConfigToken.REIMBURSEMENT_FORM,
      ).reimbursement_form_bucket;
  }

  private get invoiceBucket() {
    return admin.storage().bucket(this.invoiceBucketName);
  }

  private get reimbursementFormBucket() {
    return admin.storage().bucket(this.reimbursementFormBucketName);
  }

  private getInvoiceFileName(financeId: string): string {
    return `${financeId}.pdf`;
  }

  getInvoiceFile(financeId: string) {
    return this.invoiceBucket.file(this.getInvoiceFileName(financeId));
  }

  private getAuthenticatedReceiptUrl(filename: string): string {
    return `https://storage.cloud.google.com/${this.invoiceBucketName}/${filename}`;
  }

  private getReimbursementFormFileName(financeId: string): string {
    return `${financeId}.pdf`;
  }

  private getAuthenticatedReimbursementFormUrl(filename: string): string {
    return `https://storage.cloud.google.com/${this.reimbursementFormBucketName}/${filename}`;
  }

  async uploadReceipt(
    financeId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const filename = this.getInvoiceFileName(financeId);
    const blob = this.invoiceBucket.file(filename);
    await blob.save(file.buffer);
    return this.getAuthenticatedReceiptUrl(filename);
  }

  async uploadReimbursementForm(
    financeId: string,
    data: Buffer,
  ): Promise<string> {
    const filename = this.getReimbursementFormFileName(financeId);
    const blob = this.reimbursementFormBucket.file(filename);
    await blob.save(data);
    return this.getAuthenticatedReimbursementFormUrl(filename);
  }

  private file(filepath: string) {
    return admin.storage().bucket().file(`${CloudStorageFinance}${filepath}`);
  }

  async fetchTemplate(template: string) {
    return this.file(`/${template}.pdf`).download();
  }

  /**
   * Populates the reimbursement form PDF with given data.
   */
  async populateReimbursementForm(
    templateName: string,
    data: ReimbursementForm,
    newTitle: string,
  ): Promise<Uint8Array> {
    const [templateBytes] = await this.fetchTemplate(templateName);
    const pdfDoc = await PDFDocument.load(templateBytes);
    await this.populatePdfDocument(pdfDoc, data, ReimbursementFormMappings);
    pdfDoc.setTitle(newTitle);
    return pdfDoc.save();
  }

  /**
   * Fills a PDF's form fields given a data object and a field-mapping record.
   */
  async populatePdfDocument<T extends object>(
    pdfDoc: PDFDocument,
    data: T,
    fieldMappings: Record<keyof T, string>,
  ): Promise<void> {
    const form = pdfDoc.getForm();

    for (const key of Object.keys(data) as (keyof T)[]) {
      const pdfValue = data[key];
      const fieldName = fieldMappings[key];
      if (!fieldName) continue;

      if (typeof pdfValue === "boolean") {
        const checkBox = form.getCheckBox(fieldName);
        if (checkBox && pdfValue) checkBox.check();
      } else if (typeof pdfValue === "number") {
        const textField = form.getTextField(fieldName);
        if (textField) textField.setText(String(pdfValue));
      } else if (typeof pdfValue === "string") {
        try {
          const radioGroup = form.getRadioGroup(fieldName);
          if (radioGroup) radioGroup.select(pdfValue);
        } catch {
          const textField = form.getTextField(fieldName);
          if (textField) textField.setText(pdfValue);
        }
      }
    }
  }
}
