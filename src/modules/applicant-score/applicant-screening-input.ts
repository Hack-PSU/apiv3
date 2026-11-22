import { readFile } from "fs/promises";
import { ApplicantEvaluationInput } from "./applicant-evaluation-input.types";
import {
  ScreeningModelInput,
  ScreeningRubric,
} from "./applicant-screening.types";

// Answer fields sent to the model, in the order they appear in the request.
const ANSWER_FIELDS = [
  "project",
  "expectations",
  "excitement",
  "codingExperience",
] as const;

/**
 * Reduces the full evaluation record to the fields the model may see.
 *
 * Fields are copied one by one instead of spread or omitted so that any field
 * added to ApplicantEvaluationInput later is excluded until someone opts it in
 * here. University, major, academic year, and the resume stay on the full
 * record for organizers.
 */
export function toScreeningModelInput(
  input: ApplicantEvaluationInput,
): ScreeningModelInput {
  // TODO: Send resume content once there is text extraction plus redaction of
  // names, contact details, schools, and other identifying information. Never
  // send the raw PDF.
  return {
    applicant_id: input.userId,
    project: input.project ?? "",
    expectations: input.expectations ?? "",
    excitement: input.excitement ?? "",
    codingExperience: input.codingExperience ?? "",
  };
}

// Escapes characters that could close or open a delimiter tag, so applicant
// text cannot break out of its <applicant_answer> block.
function escapeDelimiters(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds the message sent to the screening agent. The rubric travels with
 * every request, and each applicant answer is wrapped in delimiters so the
 * agent treats it as data rather than instructions.
 */
export function buildScreeningMessage(
  rubric: ScreeningRubric,
  modelInput: ScreeningModelInput,
): string {
  const answers = ANSWER_FIELDS.map(
    (field) =>
      `<applicant_answer field="${field}">\n${escapeDelimiters(
        modelInput[field],
      )}\n</applicant_answer>`,
  ).join("\n");

  return [
    "Evaluate the application below against the rubric.",
    "",
    "<rubric>",
    JSON.stringify(rubric, null, 2),
    "</rubric>",
    "",
    `<application applicant_id="${escapeDelimiters(modelInput.applicant_id)}">`,
    answers,
    "</application>",
  ].join("\n");
}

export async function loadRubric(path: string): Promise<ScreeningRubric> {
  const rubric = JSON.parse(await readFile(path, "utf-8"));
  if (!Array.isArray(rubric?.criteria) || rubric.criteria.length === 0) {
    throw new Error(`Rubric at ${path} has no criteria`);
  }
  return rubric;
}
