/** Unit tests for transaction query parameter parsing. */

import { describe, it, expect } from "vitest";
import { parseTransactionQuery } from "./queryParams";

describe("parseTransactionQuery", () => {
  it("uses defaults when no params are provided", () => {
    const { params, errors } = parseTransactionQuery({});
    expect(errors).toHaveLength(0);
    expect(params.page).toBe(1);
    expect(params.limit).toBe(50);
    expect(params.from).toBeUndefined();
    expect(params.to).toBeUndefined();
  });

  it("accepts valid ISO dates", () => {
    const { params, errors } = parseTransactionQuery({ from: "2024-01-01", to: "2024-12-31" });
    expect(errors).toHaveLength(0);
    expect(params.from).toBe("2024-01-01");
    expect(params.to).toBe("2024-12-31");
  });

  it("rejects non-ISO date strings", () => {
    const { errors } = parseTransactionQuery({ from: "January 1 2024" });
    expect(errors.some((e) => e.field === "from")).toBe(true);
  });

  it("accepts a valid UUID for category", () => {
    const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const { params, errors } = parseTransactionQuery({ category: uuid });
    expect(errors).toHaveLength(0);
    expect(params.category).toBe(uuid);
  });

  it("rejects a non-UUID category value", () => {
    const { errors } = parseTransactionQuery({ category: "not-a-uuid" });
    expect(errors.some((e) => e.field === "category")).toBe(true);
  });

  it("parses page and limit as integers", () => {
    const { params, errors } = parseTransactionQuery({ page: "3", limit: "100" });
    expect(errors).toHaveLength(0);
    expect(params.page).toBe(3);
    expect(params.limit).toBe(100);
  });

  it("rejects page less than 1", () => {
    const { errors } = parseTransactionQuery({ page: "0" });
    expect(errors.some((e) => e.field === "page")).toBe(true);
  });

  it("rejects limit greater than 200", () => {
    const { errors } = parseTransactionQuery({ limit: "201" });
    expect(errors.some((e) => e.field === "limit")).toBe(true);
  });

  it("rejects limit of 0", () => {
    const { errors } = parseTransactionQuery({ limit: "0" });
    expect(errors.some((e) => e.field === "limit")).toBe(true);
  });

  it("passes through paymentMethod and traveller strings", () => {
    const { params, errors } = parseTransactionQuery({ paymentMethod: "Cash", traveller: "Erin" });
    expect(errors).toHaveLength(0);
    expect(params.paymentMethod).toBe("Cash");
    expect(params.traveller).toBe("Erin");
  });

  it("ignores non-string values for string fields", () => {
    const { params } = parseTransactionQuery({ traveller: 42 });
    expect(params.traveller).toBeUndefined();
  });
});
