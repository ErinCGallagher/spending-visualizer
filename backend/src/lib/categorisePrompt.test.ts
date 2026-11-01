/** Unit tests for the AI categorisation prompt builder and response parser. */

import { describe, it, expect } from "vitest";
import { buildCategorisePrompt, parseCategoriseResponse, MIN_CONFIDENCE } from "./categorisePrompt";

describe("buildCategorisePrompt", () => {
  it("includes all transaction descriptions", () => {
    const prompt = buildCategorisePrompt(
      [
        { description: "Supermarket", country: "Canada" },
        { description: "Taxi ride", country: null },
      ],
      [{ name: "Food", parentName: null }, { name: "Transport", parentName: null }]
    );
    expect(prompt).toContain("Supermarket");
    expect(prompt).toContain("Taxi ride");
  });

  it("includes the country in parentheses when present", () => {
    const prompt = buildCategorisePrompt(
      [{ description: "Bus ticket", country: "Peru" }],
      []
    );
    expect(prompt).toContain("Bus ticket (Peru)");
  });

  it("omits the country suffix when country is null", () => {
    const prompt = buildCategorisePrompt(
      [{ description: "Bus ticket", country: null }],
      []
    );
    expect(prompt).not.toContain("(null)");
    expect(prompt).toContain("Bus ticket");
  });

  it("lists available categories when provided", () => {
    const prompt = buildCategorisePrompt(
      [],
      [{ name: "Food", parentName: null }, { name: "Transport", parentName: null }]
    );
    expect(prompt).toContain("Food");
    expect(prompt).toContain("Transport");
  });

  it("shows each sub category under its parent, keeping same-named categories distinct", () => {
    const prompt = buildCategorisePrompt(
      [],
      [
        { name: "Food", parentName: null },
        { name: "Travel", parentName: null },
        { name: "Food", parentName: "Travel" },
        { name: "Flights", parentName: "Travel" },
      ]
    );
    expect(prompt).toContain("- Food\n");
    expect(prompt).toContain("- Travel > Food");
    expect(prompt).toContain("- Travel > Flights");
  });

  it("tells the model to answer Uncategorized below the minimum confidence", () => {
    const prompt = buildCategorisePrompt([], [{ name: "Food", parentName: null }]);
    expect(prompt).toContain(`"Uncategorized"`);
    expect(prompt).toContain(String(MIN_CONFIDENCE));
  });

  it("handles empty category list gracefully", () => {
    const prompt = buildCategorisePrompt([], []);
    expect(prompt).toContain("No predefined categories");
  });

  it("includes zero-based indices for each transaction", () => {
    const prompt = buildCategorisePrompt(
      [{ description: "A", country: null }, { description: "B", country: null }],
      []
    );
    expect(prompt).toContain("0: A");
    expect(prompt).toContain("1: B");
  });
});

describe("parseCategoriseResponse", () => {
  it("parses a valid JSON array response", () => {
    const text = JSON.stringify([
      { parentName: "Travel", subName: "Food", confidence: 0.9 },
      { parentName: "Transport", subName: null, confidence: 0.7 },
    ]);
    const result = parseCategoriseResponse(text, 2);
    expect(result[0]).toEqual({ parentName: "Travel", subName: "Food", confidence: 0.9, source: "ai" });
    expect(result[1]).toEqual({ parentName: "Transport", subName: null, confidence: 0.7, source: "ai" });
  });

  it("strips markdown code fences before parsing", () => {
    const text = "```json\n[{\"parentName\":\"Food\",\"subName\":null,\"confidence\":0.9}]\n```";
    const result = parseCategoriseResponse(text, 1);
    expect(result[0].parentName).toBe("Food");
  });

  it("returns fallback entries when response is not valid JSON", () => {
    const result = parseCategoriseResponse("not json", 3);
    expect(result).toHaveLength(3);
    result.forEach((r) => expect(r.confidence).toBe(0));
  });

  it("returns fallback when array length does not match count", () => {
    const text = JSON.stringify([{ parentName: "Food", subName: null, confidence: 0.9 }]);
    const result = parseCategoriseResponse(text, 2);
    expect(result).toHaveLength(2);
    result.forEach((r) => expect(r.confidence).toBe(0));
  });

  it("clamps confidence to 0–1 range", () => {
    const text = JSON.stringify([
      { parentName: "A", subName: null, confidence: 1.5 },
      { parentName: "B", subName: null, confidence: -0.2 },
    ]);
    const result = parseCategoriseResponse(text, 2);
    expect(result[0].confidence).toBe(1);
    expect(result[1].confidence).toBe(0);
  });

  it("defaults parentName to Uncategorized and subName to null when missing", () => {
    const text = JSON.stringify([{ confidence: 0.5 }]);
    const result = parseCategoriseResponse(text, 1);
    expect(result[0].parentName).toBe("Uncategorized");
    expect(result[0].subName).toBeNull();
  });

  it("returns Uncategorized when confidence is below the minimum", () => {
    const text = JSON.stringify([
      { parentName: "Travel", subName: "Food", confidence: MIN_CONFIDENCE - 0.01 },
      { parentName: "Travel", subName: "Food", confidence: MIN_CONFIDENCE },
    ]);
    const result = parseCategoriseResponse(text, 2);
    expect(result[0]).toEqual({
      parentName: "Uncategorized",
      subName: null,
      confidence: MIN_CONFIDENCE - 0.01,
      source: "ai",
    });
    expect(result[1].parentName).toBe("Travel");
    expect(result[1].subName).toBe("Food");
  });

  it("ignores a subName that is not a string", () => {
    const text = JSON.stringify([{ parentName: "Food", subName: 5, confidence: 0.5 }]);
    const result = parseCategoriseResponse(text, 1);
    expect(result[0].subName).toBeNull();
  });
});
