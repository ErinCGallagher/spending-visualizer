import { describe, it, expect } from "vitest";
import { getSpendBand, SPEND_BANDS } from "./spendCategoryConfig";

describe("spendCategoryConfig", () => {
  describe("getSpendBand", () => {
    it("should return 'Cheap' for amounts below the threshold", () => {
      const band = getSpendBand(100);
      expect(band.label).toBe("Cheap");
      expect(band.badgeClass).toBe("bg-green-100");
    });

    it("should return 'Moderate' for amounts between thresholds", () => {
      const band = getSpendBand(250);
      expect(band.label).toBe("Moderate");
      expect(band.badgeClass).toBe("bg-yellow-100");
    });

    it("should return 'Expensive' for amounts above the highest threshold", () => {
      const band = getSpendBand(350);
      expect(band.label).toBe("Expensive");
      expect(band.badgeClass).toBe("bg-red-100");
    });

    it("should handle boundary values correctly", () => {
      // Cheap max is 230 (exclusive upper bound)
      // If perDay < 230, it's Cheap. If perDay === 230, it's Moderate.
      
      expect(getSpendBand(229).label).toBe("Cheap");
      expect(getSpendBand(230).label).toBe("Moderate");
      
      // Moderate max is 300 (exclusive upper bound)
      expect(getSpendBand(299).label).toBe("Moderate");
      expect(getSpendBand(300).label).toBe("Expensive");
    });

    it("should use the last band as fallback", () => {
      const band = getSpendBand(10000);
      expect(band.label).toBe("Expensive");
    });
  });

  describe("SPEND_BANDS", () => {
    it("should have the expected bands defined", () => {
      expect(SPEND_BANDS).toHaveLength(3);
      expect(SPEND_BANDS[0].label).toBe("Cheap");
      expect(SPEND_BANDS[1].label).toBe("Moderate");
      expect(SPEND_BANDS[2].label).toBe("Expensive");
    });
  });
});
