export const CloudStorageEmail = "email-template";
export const SendGridModuleOptionsProvider = "EmailModuleRootOptionsProvider";
export const SendGridModuleConnectionProvider =
  "EmailModuleRootConnectionProvider";
export const DefaultFromEmail = "team@hackpsu.org";
export const DefaultFromName = "HackPSU";

export enum DefaultTemplate {
  registration = "registration",
  participantAccepted = "participant-accepted",
  organizerFirstLogin = "organizer-first-login",
  reimbursementApproved = "reimbursement-approved",
  reimbursementRejected = "reimbursement-rejected",
  reimbursementFormCompleted = "reimbursement-form-completed",
  organizerReject = "organizer-reject",
  organizerReject2 = "organizer-reject-2"
}
