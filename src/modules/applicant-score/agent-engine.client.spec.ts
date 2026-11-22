import { extractFinalText } from "./agent-engine.client";
import { ScreeningOutputError } from "./applicant-screening.parser";

const event = (text: string) =>
  JSON.stringify({
    author: "hackpsu_screening_dev",
    content: { role: "model", parts: [{ text }] },
  });

describe("extractFinalText", () => {
  it("returns the text of the last event with text", () => {
    const body = [
      JSON.stringify({ author: "user", actions: {} }),
      event("draft"),
      event('{"applicant_id":"user-123"}'),
      "",
    ].join("\n");
    expect(extractFinalText(body)).toBe('{"applicant_id":"user-123"}');
  });

  it("joins multiple text parts in one event", () => {
    const body = JSON.stringify({
      content: { parts: [{ text: '{"a":' }, { text: "1}" }] },
    });
    expect(extractFinalText(body)).toBe('{"a":1}');
  });

  it("handles SSE data: framing", () => {
    const body = `data: ${event("first")}\n\ndata: ${event("final")}\n\n`;
    expect(extractFinalText(body)).toBe("final");
  });

  it("throws when no event has text", () => {
    expect(() => extractFinalText(JSON.stringify({ actions: {} }))).toThrow(
      ScreeningOutputError,
    );
    expect(() => extractFinalText("")).toThrow(ScreeningOutputError);
  });

  it("throws on a non-JSON event", () => {
    expect(() => extractFinalText("<html>Bad Gateway</html>")).toThrow(
      ScreeningOutputError,
    );
  });

  it("throws on an agent error event", () => {
    const body = JSON.stringify({
      error_code: "SAFETY",
      error_message: "Blocked",
    });
    expect(() => extractFinalText(body)).toThrow(/SAFETY Blocked/);
  });
});
