/** Unit tests for the shared chart route SQL filter builder. */

import { describe, it, expect } from "vitest";
import { buildChartFilterSQL } from "./chartFilters";

describe("buildChartFilterSQL", () => {
  it("only scopes to the user when no filters are given", () => {
    const { joins, conditions, values } = buildChartFilterSQL("user1", {});
    expect(joins).toEqual([]);
    expect(conditions).toEqual(["t.user_id = $1"]);
    expect(values).toEqual(["user1"]);
  });

  it("adds inclusive date bounds", () => {
    const { conditions, values } = buildChartFilterSQL("user1", { from: "2024-01-01", to: "2024-01-31" });
    expect(conditions).toContain("t.date >= $2");
    expect(conditions).toContain("t.date <= $3");
    expect(values).toEqual(["user1", "2024-01-01", "2024-01-31"]);
  });

  it("matches any of the given countries", () => {
    const { conditions, values } = buildChartFilterSQL("user1", { countries: ["Canada", "Peru"] });
    expect(conditions).toContain("t.country = ANY($2)");
    expect(values[1]).toEqual(["Canada", "Peru"]);
  });

  it("ignores an empty countries list", () => {
    const { conditions } = buildChartFilterSQL("user1", { countries: [] });
    expect(conditions).toEqual(["t.user_id = $1"]);
  });

  it("joins groups to filter by group type", () => {
    const { joins, conditions, values } = buildChartFilterSQL("user1", { groupTypes: ["trip"] });
    expect(joins).toEqual(["JOIN groups g ON g.id = t.group_id"]);
    expect(conditions).toContain("g.group_type = ANY($2)");
    expect(values[1]).toEqual(["trip"]);
  });

  it("filters by group id", () => {
    const { conditions } = buildChartFilterSQL("user1", { groupId: "g-1" });
    expect(conditions).toContain("t.group_id = $2");
  });

  it("numbers placeholders in the order filters are applied", () => {
    const { conditions, values } = buildChartFilterSQL("user1", {
      from: "2024-01-01",
      countries: ["Canada"],
      groupTypes: ["trip"],
    });
    expect(conditions).toEqual([
      "t.user_id = $1",
      "t.date >= $2",
      "t.country = ANY($3)",
      "g.group_type = ANY($4)",
    ]);
    expect(values).toHaveLength(4);
  });
});
