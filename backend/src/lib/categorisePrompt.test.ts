/** Unit tests for the AI categorisation prompt builder and response parser. */

import { describe, it, expect } from "vitest";
import { buildCategorisePrompt, parseCategoriseResponse } from "./categorisePrompt";

describe("buildCategorisePrompt", () => {
  it("includes all transaction descriptions", () => {
    const prompt = buildCategorisePrompt(
      [
        { description: "Supermarket", country: "Canada" },
        { description: "Taxi ride", country: null },
      ],
      ["Food", "Transport"]
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
    const prompt = buildCategorisePrompt([], ["Food", "Transport"]);
    expect(prompt).toContain("Food");
    expect(prompt).toContain("Transport");
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
      { categoryName: "Food", confidence: 0.9 },
      { categoryName: "Transport", confidence: 0.7 },
    ]);
    const result = parseCategoriseResponse(text, 2);
    expect(result[0]).toEqual({ categoryName: "Food", confidence: 0.9, source: "ai" });
    expect(result[1]).toEqual({ categoryName: "Transport", confidence: 0.7, source: "ai" });
  });

  it("strips markdown code fences before parsing", () => {
    const text = "```json\n[{\"categoryName\":\"Food\",\"confidence\":0.9}]\n```";
    const result = parseCategoriseResponse(text, 1);
    expect(result[0].categoryName).toBe("Food");
  });

  it("returns fallback entries when response is not valid JSON", () => {
    const result = parseCategoriseResponse("not json", 3);
    expect(result).toHaveLength(3);
    result.forEach((r) => expect(r.confidence).toBe(0));
  });

  it("returns fallback when array length does not match count", () => {
    const text = JSON.stringify([{ categoryName: "Food", confidence: 0.9 }]);
    const result = parseCategoriseResponse(text, 2);
    expect(result).toHaveLength(2);
    result.forEach((r) => expect(r.confidence).toBe(0));
  });

  it("clamps confidence to 0–1 range", () => {
    const text = JSON.stringify([
      { categoryName: "A", confidence: 1.5 },
      { categoryName: "B", confidence: -0.2 },
    ]);
    const result = parseCategoriseResponse(text, 2);
    expect(result[0].confidence).toBe(1);
    expect(result[1].confidence).toBe(0);
  });

  it("defaults categoryName to Uncategorized when missing", () => {
    const text = JSON.stringify([{ confidence: 0.5 }]);
    const result = parseCategoriseResponse(text, 1);
    expect(result[0].categoryName).toBe("Uncategorized");
  });
});
