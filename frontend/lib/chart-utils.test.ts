import { describe, it, expect } from "vitest";
import { pivotData } from "./chart-utils";

describe("chart-utils", () => {
  describe("pivotData", () => {
    it("should correctly pivot data when categories are present", () => {
      const data = [
        { month: "2024-01", category: "Food", total: 100 },
        { month: "2024-01", category: "Transport", total: 50 },
        { month: "2024-02", category: "Food", total: 120 },
        { month: "2024-02", category: "Transport", total: 60 },
      ];

      const result = pivotData(data);

      expect(result.categories).toEqual(["Food", "Transport"]);
      expect(result.pivoted).toEqual([
        { month: "2024-01", Food: 100, Transport: 50 },
        { month: "2024-02", Food: 120, Transport: 60 },
      ]);
    });

    it("should gracefully handle datasets with missing categories (producing a single 'Total' series)", () => {
      const data = [
        { month: "2024-01", total: 150 },
        { month: "2024-02", total: 180 },
      ];

      const result = pivotData(data);

      expect(result.categories).toEqual(["Total"]);
      expect(result.pivoted).toEqual([
        { month: "2024-01", Total: 150 },
        { month: "2024-02", Total: 180 },
      ]);
    });

    it("should correctly sort months chronologically", () => {
      const data = [
        { month: "2024-02", category: "Food", total: 120 },
        { month: "2024-01", category: "Food", total: 100 },
      ];

      const result = pivotData(data);

      expect(result.pivoted[0].month).toBe("2024-01");
      expect(result.pivoted[1].month).toBe("2024-02");
    });

    it("should handle empty data arrays without throwing errors", () => {
      const result = pivotData([]);

      expect(result.categories).toEqual(["Total"]);
      expect(result.pivoted).toEqual([]);
    });

    it("should handle missing data for some categories in a month", () => {
      const data = [
        { month: "2024-01", category: "Food", total: 100 },
        { month: "2024-02", category: "Transport", total: 60 },
      ];

      const result = pivotData(data);

      expect(result.categories).toEqual(["Food", "Transport"]);
      expect(result.pivoted).toEqual([
        { month: "2024-01", Food: 100, Transport: 0 },
        { month: "2024-02", Food: 0, Transport: 60 },
      ]);
    });
  });
});
