import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import StepCreditCardCategories from "./StepCreditCardCategories";
import type { Category } from "./types";

const taxonomy: Category[] = [
  { id: "1", name: "Travel", parentId: null, children: [{ id: "2", name: "Flights" }] },
];

describe("StepCreditCardCategories", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits the parents already chosen in the AI review step", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <StepCreditCardCategories
        newCategories={[
          { categoryName: "Hobbies", parentName: null },
          { categoryName: "Climbing", parentName: "Hobbies" },
          { categoryName: "Hostels", parentName: "Travel" },
        ]}
        existingTaxonomy={taxonomy}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const { categories } = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(categories).toEqual(
      expect.arrayContaining([
        { name: "Hobbies", parentName: null },
        { name: "Climbing", parentName: "Hobbies" },
        { name: "Hostels", parentName: "Travel" },
      ])
    );
  });
});
