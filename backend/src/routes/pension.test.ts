/** Unit tests for the pension route row mapper function. */

import { describe, it, expect } from "vitest";
import { mapPensionRow } from "./pension";

describe("mapPensionRow", () => {
  it("maps month through and parses the amount", () => {
    const row = { month: 3, amount: "412.50" };
    const result = mapPensionRow(row);
    expect(result).toEqual({ month: 3, amount: 412.5 });
  });

  it("parses whole-number string amounts", () => {
    const row = { month: 12, amount: "2000" };
    const result = mapPensionRow(row);
    expect(result.amount).toBe(2000);
  });
});
