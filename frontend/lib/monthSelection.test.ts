import { describe, it, expect } from "vitest";
import { toggleMonthSelection, monthSelectionRange } from "./monthSelection";

describe("toggleMonthSelection", () => {
  it("starts a selection from nothing", () => {
    expect(toggleMonthSelection([], "2026-03")).toEqual(["2026-03"]);
  });

  it("extends the range with the month after it", () => {
    expect(toggleMonthSelection(["2026-03"], "2026-04")).toEqual(["2026-03", "2026-04"]);
  });

  it("extends the range with the month before it", () => {
    expect(toggleMonthSelection(["2026-03", "2026-04"], "2026-02")).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
    ]);
  });

  it("extends across a year boundary", () => {
    expect(toggleMonthSelection(["2025-12"], "2026-01")).toEqual(["2025-12", "2026-01"]);
  });

  it("turns off a month when it is tapped again", () => {
    expect(toggleMonthSelection(["2026-03"], "2026-03")).toEqual([]);
  });

  it("turns off the first or last month of a range", () => {
    expect(toggleMonthSelection(["2026-03", "2026-04", "2026-05"], "2026-03")).toEqual([
      "2026-04",
      "2026-05",
    ]);
    expect(toggleMonthSelection(["2026-03", "2026-04", "2026-05"], "2026-05")).toEqual([
      "2026-03",
      "2026-04",
    ]);
  });

  it("starts over with the tapped month when it is not adjacent", () => {
    expect(toggleMonthSelection(["2026-03", "2026-04"], "2026-07")).toEqual(["2026-07"]);
  });

  it("starts over with the tapped month when it is inside the range, to keep the range unbroken", () => {
    expect(toggleMonthSelection(["2026-03", "2026-04", "2026-05"], "2026-04")).toEqual(["2026-04"]);
  });
});

describe("monthSelectionRange", () => {
  it("covers a single month from its first to last day", () => {
    expect(monthSelectionRange(["2024-02"])).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });

  it("covers from the first month's start to the last month's end", () => {
    expect(monthSelectionRange(["2026-03", "2026-04", "2026-05"])).toEqual({
      from: "2026-03-01",
      to: "2026-05-31",
    });
  });

  it("is unbounded for no months", () => {
    expect(monthSelectionRange([])).toEqual({ from: "", to: "" });
  });
});
