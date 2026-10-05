export type ScreeningConfidence = "high" | "medium" | "low";

export interface ScreeningRubricLevel {
  score: number;
  description: string;
}

export interface ScreeningRubricCriterion {
  id: string;
  name: string;
  description: string;
  levels: ScreeningRubricLevel[];
}

export interface ScreeningRubric {
  version?: string;
  criteria: ScreeningRubricCriterion[];
}

/**
 * The subset of an ApplicantEvaluationInput that is sent to the model.
 * Demographic and identifying fields are deliberately left out.
 */
export interface ScreeningModelInput {
  applicant_id: string;
  project: string;
  expectations: string;
  excitement: string;
  codingExperience: string;
}

export interface ScreeningCriterionScore {
  criterion: string;
  score: number;
  rationale: string;
  confidence: ScreeningConfidence;
}

/** Mirrors ScreeningResult in agents/applicant_screening/schemas.py. */
export interface ScreeningResult {
  applicant_id: string;
  scores: ScreeningCriterionScore[];
  overall_confidence: ScreeningConfidence;
  flagged: boolean;
  flag_reason: string | null;
}
