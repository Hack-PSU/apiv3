import { AppOptions } from "firebase-admin";

export type FirebaseConfig = AppOptions & {
  appName?: string;
};

export type ResumeBucketConfig = {
  resume_bucket?: string;
};

export type InvoiceBucketConfig = {
  invoice_bucket?: string;
};

export type ReimbursementFormBucketConfig = {
  reimbursement_form_bucket?: string;
};

export type PhotoBucketConfig = {
  photo_bucket?: string;
  photo_cdn_url?: string;
};

export type GoogleCloudCoreModuleOptions = {
  imports?: any[];
  useFactory: (...args: any[]) => FirebaseConfig;
  inject?: any[];
};
