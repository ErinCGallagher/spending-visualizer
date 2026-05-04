import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDashboardData } from "./useDashboardData";
import type { FilterValues } from "./Filters";

// Mock fetch
const globalFetch = vi.fn();
vi.stubGlobal("fetch", globalFetch);

const mockMeta = {
  categories: [],
  travellers: [],
  paymentMethods: [],
  countries: [],
  dateRange: { from: "2024-01-01", to: "2024-12-31" },
  groups: [],
  groupTypes: [],
  overviewDefaultFilter: null,
  tripDefaultFilter: null,
  homeCurrency: "CAD",
};

describe("useDashboardData Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initially returns loading states and null meta", async () => {
    globalFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMeta,
    });

    const { result } = renderHook(() =>
      useDashboardData(null, "total", "day", "day")
    );

    expect(result.current.metaLoading).toBe(true);
    expect(result.current.meta).toBe(null);

    // Wait for the hook to finish its initial fetch cycle to avoid 'act' warnings
    await waitFor(() => expect(result.current.metaLoading).toBe(false));
  });

  it("does not fetch charts when filters are null", async () => {
    globalFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMeta,
    });

    const { result } = renderHook(() =>
      useDashboardData(null, "total", "day", "day")
    );

    await waitFor(() => expect(result.current.metaLoading).toBe(false));

    // Should only have called fetch for meta
    expect(globalFetch).toHaveBeenCalledTimes(1);
    expect(globalFetch).toHaveBeenCalledWith("/api/transactions/meta", expect.any(Object));
  });

  it("fetches charts when filters are provided", async () => {
    // 1st call: meta
    // 2nd-5th calls: charts
    globalFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMeta,
    });

    const filters: FilterValues = {
      from: "2024-01-01",
      to: "2024-01-31",
      travellers: [],
      countries: [],
      groupTypes: ["trip"],
    };

    const { result, rerender } = renderHook(
      ({ f }) => useDashboardData(f, "total", "day", "day"),
      { initialProps: { f: null as FilterValues | null } }
    );

    // Load meta first
    await waitFor(() => expect(result.current.metaLoading).toBe(false));
    expect(globalFetch).toHaveBeenCalledTimes(1);

    // Provide filters
    rerender({ f: filters });

    await waitFor(() => expect(result.current.categoryLoading).toBe(false));
    
    // Should have fired 4 chart requests
    expect(globalFetch).toHaveBeenCalledTimes(5);
    expect(globalFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/charts/category-totals?from=2024-01-01&to=2024-01-31&groupType=trip"),
      expect.any(Object)
    );
  });
});
