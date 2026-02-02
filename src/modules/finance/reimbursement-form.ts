/**
 * Describe the fields for your "finance" PDF form.
 * You can name them however you like; these are just examples.
 */
export interface ReimbursementForm {
  unrestricted30?: boolean;
  upacAllocatedFunds10?: boolean;
  activityFee40?: boolean;
  summerAllocation?: boolean;

  orgAcct?: number;
  total?: number;
  fs1?: number;
  fs2?: number;
  fs3?: number;
  fs4?: number;
  amount1?: number;
  amount2?: number;
  amount3?: number;
  amount4?: number;

  activityCode?: string;
  organization?: string;
  payeeName?: string;
  mailingAddress1?: string;
  mailingAddress2?: string;
  mailingAddress3?: string;
  email?: string;
  description1?: string;
  description2?: string;
  description3?: string;
  description4?: string;
  objectCode1?: string;
  objectCode2?: string;
  objectCode3?: string;
  objectCode4?: string;
  Date?: string;

  Group1?: "Choice1" | "Choice2" | "Choice3";
}

export const ReimbursementFormMappings: Record<
  keyof ReimbursementForm,
  string
> = {
  unrestricted30: "UNRESTRICTED  30",
  upacAllocatedFunds10: "UPAC allocated Funds 10",
  activityFee40: "ACTIVITY FEE  40",
  summerAllocation: "Summer Allocation",

  orgAcct: "ORGACCT",
  total: "TOTAL",
  fs1: "FS1",
  fs2: "FS2",
  fs3: "FS3",
  fs4: "FS4",
  amount1: "Amount 1",
  amount2: "Amount 2",
  amount3: "Amount 3",
  amount4: "Amount 4",

  activityCode: "ACTIVITY CODE if applicable",
  organization: "ORGANIZATION",
  payeeName: "PAYEE please print clearly",
  mailingAddress1: "MAILING ADDRESS If applicable 1",
  mailingAddress2: "MAILING ADDRESS If applicable 2",
  mailingAddress3: "MAILING ADDRESS If applicable 3",
  email: "EMAIL",
  description1: "Description 1",
  description2: "Description 2",
  description3: "Description 3",
  description4: "Description 4",
  objectCode1: "Object Code 1",
  objectCode2: "Object Code 2",
  objectCode3: "Object code 3",
  objectCode4: "Object Code 4",
  Date: "Today's Date 1_af_date",

  Group1: "Group1",
};

export const ReimbursementFormName = "cheque-request-form-new";
