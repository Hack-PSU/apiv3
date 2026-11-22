import {
  ScreeningConfidence,
  ScreeningCriterionScore,
  ScreeningResult,
} from "./applicant-screening.types";

const CONFIDENCE_LEVELS: ScreeningConfidence[] = ["high", "medium", "low"];

export class ScreeningOutputError extends Error {
  constructor(
    message: string,
    readonly rawOutput: string,
  ) {
    super(message);
    this.name = "ScreeningOutputError";
  }
}

export interface ScreeningExpectations {
  applicantId?: string;
  criteria?: string[];
}

// The agent's output_schema should guarantee bare JSON, but tolerate a
// Markdown code fence around it.
function stripCodeFence(text: string): string {
  const match = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : text.trim();
}

function isConfidence(value: unknown): value is ScreeningConfidence {
  return CONFIDENCE_LEVELS.includes(value as ScreeningConfidence);
}

function parseScore(
  value: any,
  index: number,
  raw: string,
): ScreeningCriterionScore {
  const fail = (reason: string) => {
    throw new ScreeningOutputError(`scores[${index}] ${reason}`, raw);
  };

  if (typeof value !== "object" || value === null) fail("is not an object");
  if (typeof value.criterion !== "string" || !value.criterion) {
    fail("has no criterion");
  }
  if (!Number.isInteger(value.score) || value.score < 1 || value.score > 5) {
    fail("score must be an integer from 1 to 5");
  }
  if (typeof value.rationale !== "string") fail("has no rationale");
  if (!isConfidence(value.confidence)) fail("has an invalid confidence");

  return {
    criterion: value.criterion,
    score: value.score,
    rationale: value.rationale,
    confidence: value.confidence,
  };
}

/**
 * Parses and validates the agent's JSON output. Throws ScreeningOutputError if
 * the output is not valid JSON, does not match ScreeningResult, or does not
 * match the request (wrong applicant, missing or unknown criteria).
 */
export function parseScreeningResult(
  text: string,
  expected: ScreeningExpectations = {},
): ScreeningResult {
  let data: any;
  try {
    data = JSON.parse(stripCodeFence(text));
  } catch {
    throw new ScreeningOutputError("Output is not valid JSON", text);
  }

  const fail = (reason: string) => {
    throw new ScreeningOutputError(reason, text);
  };

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    fail("Output is not a JSON object");
  }
  if (typeof data.applicant_id !== "string" || !data.applicant_id) {
    fail("Missing applicant_id");
  }
  if (!Array.isArray(data.scores)) fail("scores must be an array");
  if (!isConfidence(data.overall_confidence)) {
    fail("Invalid overall_confidence");
  }
  if (typeof data.flagged !== "boolean") fail("flagged must be a boolean");
  if (data.flag_reason != null && typeof data.flag_reason !== "string") {
    fail("flag_reason must be a string or null");
  }

  const scores = data.scores.map((score: unknown, i: number) =>
    parseScore(score, i, text),
  );

  if (expected.applicantId && data.applicant_id !== expected.applicantId) {
    fail(
      `applicant_id ${data.applicant_id} does not match ${expected.applicantId}`,
    );
  }

  if (expected.criteria) {
    const returned = scores.map((s) => s.criterion).sort();
    const wanted = [...expected.criteria].sort();
    if (
      returned.length !== wanted.length ||
      returned.some((criterion, i) => criterion !== wanted[i])
    ) {
      fail(
        `Scored criteria [${returned.join(", ")}] do not match rubric [${wanted.join(", ")}]`,
      );
    }
  }

  return {
    applicant_id: data.applicant_id,
    scores,
    overall_confidence: data.overall_confidence,
    flagged: data.flagged,
    flag_reason: data.flag_reason ?? null,
  };
}
