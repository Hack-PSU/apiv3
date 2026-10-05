export interface ApplicantEvaluationResume {
  mimeType: "application/pdf";
  base64Data: string;
}

export interface ApplicantEvaluationInput {
  hackathonId: string;
  userId: string;
  project: string;
  expectations: string;
  excitement: string;
  codingExperience: string;
  academicYear: string;
  major: string;
  university: string;
  resume: ApplicantEvaluationResume | null;
}
