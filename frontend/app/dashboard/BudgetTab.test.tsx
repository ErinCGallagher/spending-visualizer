import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BudgetTab from "./BudgetTab";

const groups = [
  { id: "g1", name: "Daily Living", groupType: "daily" },
  { id: "g2", name: "Japan Trip", groupType: "trip" },
];

describe("BudgetTab", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("shows the group picker on first run (no settings saved)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    render(<BudgetTab groups={groups} />);

    expect(await screen.findByText(/set up your budget/i)).toBeInTheDocument();
    expect(screen.getByText("Daily Living")).toBeInTheDocument();
    expect(screen.getByText("Japan Trip")).toBeInTheDocument();
  });

  it("saves the selected group and shows the placeholder", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => null })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ groupId: "g1" }) });

    render(<BudgetTab groups={groups} />);

    await screen.findByText(/set up your budget/i);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "g1" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/daily living/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /create your budget/i })).toHaveAttribute(
        "href",
        "/budget/setup"
      );
    });

    expect(global.fetch).toHaveBeenLastCalledWith(
      "/api/budget-settings",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ groupId: "g1" }),
      })
    );
  });

  it("shows the existing group placeholder when settings already exist", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ groupId: "g1", groupName: "Daily Living", groupType: "daily" }),
    });

    render(<BudgetTab groups={groups} />);

    expect(await screen.findByText(/daily living/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create your budget/i })).toBeInTheDocument();
  });

  it("prompts to import transactions when there are no groups yet", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    render(<BudgetTab groups={[]} />);

    expect(await screen.findByText(/no groups yet/i)).toBeInTheDocument();
  });
});
