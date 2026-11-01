/** Unit tests for validating a transaction selection (explicit ids or list filter). */

import { describe, it, expect } from "vitest";
import { parseBulkDeleteBody, parseTransactionSelection } from "./transactionSelection";

const ID = "11111111-1111-4111-8111-111111111111";

describe("parseTransactionSelection", () => {
  it("accepts ids mode", () => {
    const { selection, errors } = parseTransactionSelection({ ids: [ID] });
    expect(errors).toEqual([]);
    expect(selection).toEqual({ ids: [ID], filter: undefined });
  });

  it("accepts filter mode", () => {
    const { selection, errors } = parseTransactionSelection({ filter: { from: "2024-01-01" } });
    expect(errors).toEqual([]);
    expect(selection.filter).toEqual({ from: "2024-01-01" });
  });

  it("rejects neither ids nor filter", () => {
    expect(parseTransactionSelection({}).errors).toHaveLength(1);
  });

  it("rejects both ids and filter", () => {
    expect(parseTransactionSelection({ ids: [ID], filter: {} }).errors).toHaveLength(1);
  });

  it("rejects an empty ids array", () => {
    expect(parseTransactionSelection({ ids: [] }).errors[0].field).toBe("ids");
  });

  it("rejects non-UUID ids", () => {
    expect(parseTransactionSelection({ ids: ["nope"] }).errors[0].field).toBe("ids");
  });

  it("rejects a filter that is not an object", () => {
    expect(parseTransactionSelection({ filter: "all" }).errors[0].field).toBe("filter");
  });
});

describe("parseBulkDeleteBody", () => {
  it("returns the parsed selection", () => {
    const { params, errors } = parseBulkDeleteBody({ ids: [ID] });
    expect(errors).toEqual([]);
    expect(params.ids).toEqual([ID]);
  });

  it("treats a missing body as invalid", () => {
    expect(parseBulkDeleteBody(undefined).errors).toHaveLength(1);
  });
});
