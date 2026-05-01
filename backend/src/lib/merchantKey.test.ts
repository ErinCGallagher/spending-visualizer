/** Unit tests for the merchant key normalisation helper. */

import { describe, it, expect } from "vitest";
import { toMerchantKey } from "./merchantKey";

describe("toMerchantKey", () => {
  it("lowercases the string", () => {
    expect(toMerchantKey("H&M")).toBe("h&m");
  });

  it("trims leading whitespace", () => {
    expect(toMerchantKey("  AMAZON")).toBe("amazon");
  });

  it("trims trailing whitespace", () => {
    expect(toMerchantKey("AMAZON  ")).toBe("amazon");
  });

  it("collapses internal whitespace runs to a single space", () => {
    expect(toMerchantKey("IZI*MOUNTAIN  VIEW   EXPERIE")).toBe("izi*mountain view experie");
  });

  it("is idempotent", () => {
    const key = toMerchantKey("  SOME  Merchant  ");
    expect(toMerchantKey(key)).toBe(key);
  });
});
