import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDashboardView } from "./useDashboardView";

const replace = vi.fn();
let mockSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

describe("useDashboardView", () => {
  beforeEach(() => {
    replace.mockClear();
    mockSearch = "";
  });

  it("defaults to overview when the tab param is absent", () => {
    const { result } = renderHook(() => useDashboardView());
    expect(result.current[0]).toBe("overview");
  });

  it("reads the active tab from the tab param", () => {
    mockSearch = "tab=budget";
    const { result } = renderHook(() => useDashboardView());
    expect(result.current[0]).toBe("budget");
  });

  it("falls back to overview for an invalid tab param", () => {
    mockSearch = "tab=bogus";
    const { result } = renderHook(() => useDashboardView());
    expect(result.current[0]).toBe("overview");
  });

  it("writes the tab to the URL via router.replace without scrolling", () => {
    const { result } = renderHook(() => useDashboardView());
    act(() => {
      result.current[1]("trip");
    });
    expect(replace).toHaveBeenCalledTimes(1);
    const [href, options] = replace.mock.calls[0];
    expect(href).toContain("tab=trip");
    expect(options).toEqual({ scroll: false });
  });

  it("preserves other query params when changing the tab", () => {
    mockSearch = "from=2026-01-01&tab=overview";
    const { result } = renderHook(() => useDashboardView());
    act(() => {
      result.current[1]("budget");
    });
    const [href] = replace.mock.calls[0];
    const params = new URLSearchParams(href.replace(/^\?/, ""));
    expect(params.get("tab")).toBe("budget");
    expect(params.get("from")).toBe("2026-01-01");
  });
});
