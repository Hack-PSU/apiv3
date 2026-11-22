import {
  parseScreeningResult,
  ScreeningOutputError,
} from "./applicant-screening.parser";

const validResult = {
  applicant_id: "user-123",
  scores: [
    {
      criterion: "interest",
      score: 4,
      rationale: "Mentions wanting to build a shuttle tracker.",
      confidence: "high",
    },
    {
      criterion: "learning_goals",
      score: 3,
      rationale: "Wants to learn React.",
      confidence: "medium",
    },
  ],
  overall_confidence: "medium",
  flagged: false,
  flag_reason: null,
};

const parse = (value: unknown, expected = {}) =>
  parseScreeningResult(
    typeof value === "string" ? value : JSON.stringify(value),
    expected,
  );

describe("parseScreeningResult", () => {
  it("parses a valid result", () => {
    expect(parse(validResult)).toEqual(validResult);
  });

  it("parses JSON wrapped in a code fence", () => {
    expect(parse("```json\n" + JSON.stringify(validResult) + "\n```")).toEqual(
      validResult,
    );
  });

  it("defaults a missing flag_reason to null", () => {
    const withoutReason: Partial<typeof validResult> = { ...validResult };
    delete withoutReason.flag_reason;
    expect(parse(withoutReason).flag_reason).toBeNull();
  });

  it("drops fields that are not in the schema", () => {
    expect(parse({ ...validResult, extra: "x" })).not.toHaveProperty("extra");
  });

  it("accepts output that matches the expected applicant and criteria", () => {
    expect(
      parse(validResult, {
        applicantId: "user-123",
        criteria: ["learning_goals", "interest"],
      }),
    ).toEqual(validResult);
  });

  it.each([
    ["non-JSON text", "I think this applicant is great"],
    ["truncated JSON", JSON.stringify(validResult).slice(0, 40)],
    ["a JSON array", []],
    ["missing applicant_id", { ...validResult, applicant_id: undefined }],
    ["scores that are not an array", { ...validResult, scores: {} }],
    [
      "an invalid overall_confidence",
      { ...validResult, overall_confidence: "certain" },
    ],
    ["a non-boolean flagged", { ...validResult, flagged: "no" }],
    ["a non-string flag_reason", { ...validResult, flag_reason: 1 }],
  ])("rejects %s", (_, value) => {
    expect(() => parse(value)).toThrow(ScreeningOutputError);
  });

  it.each([
    ["a score above 5", { score: 6 }],
    ["a score below 1", { score: 0 }],
    ["a non-integer score", { score: 3.5 }],
    ["a string score", { score: "4" }],
    ["an invalid confidence", { confidence: "very high" }],
    ["a missing criterion", { criterion: undefined }],
    ["a missing rationale", { rationale: undefined }],
  ])("rejects a criterion score with %s", (_, override) => {
    const value = {
      ...validResult,
      scores: [{ ...validResult.scores[0], ...override }],
    };
    expect(() => parse(value)).toThrow(ScreeningOutputError);
  });

  it("rejects output for a different applicant", () => {
    expect(() => parse(validResult, { applicantId: "user-999" })).toThrow(
      /does not match/,
    );
  });

  it("rejects output with missing or unknown criteria", () => {
    expect(() =>
      parse(validResult, {
        criteria: ["interest", "learning_goals", "project_idea"],
      }),
    ).toThrow(ScreeningOutputError);
    expect(() =>
      parse(validResult, { criteria: ["interest", "project_idea"] }),
    ).toThrow(ScreeningOutputError);
  });

  it("keeps the raw output on the error", () => {
    expect(() => parse("not json")).toThrow(
      expect.objectContaining({ rawOutput: "not json" }),
    );
  });
});
