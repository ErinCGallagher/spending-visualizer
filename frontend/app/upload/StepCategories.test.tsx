import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StepCategories from "./StepCategories";
import { callOrganiseCategories } from "./category-shared";

vi.mock("./category-shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./category-shared")>();
  return {
    ...actual,
    callOrganiseCategories: vi.fn(),
  };
});

describe("StepCategories", () => {
  const mockOnContinue = vi.fn();
  const mockOnBack = vi.fn();
  const mockParsedCategories = ["Food", "Transport", "Unrecognized"];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { name: "Dining Out", children: [{ name: "Food" }] },
      ],
    });
  });

  it("renders correctly after loading existing categories", async () => {
    render(
      <StepCategories
        parsedCategories={mockParsedCategories}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText(/Loading categories…/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading categories…/i)).not.toBeInTheDocument();
      expect(screen.getByText("Basic")).toBeInTheDocument();
      expect(screen.getByText("Advanced")).toBeInTheDocument();
      expect(screen.getByText("Unrecognized")).toBeInTheDocument();
    });
  });

  it("switches to Advanced mode", async () => {
    render(
      <StepCategories
        parsedCategories={mockParsedCategories}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    await waitFor(() => screen.getByText("Advanced"));
    fireEvent.click(screen.getByText("Advanced"));

    expect(screen.getByText(/How it works/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ungrouped/i).length).toBeGreaterThan(0);
  });

  it("calls onContinue with assignments in Basic mode", async () => {
    (callOrganiseCategories as any).mockResolvedValue({
      ok: true,
      taxonomy: [],
    });

    render(
      <StepCategories
        parsedCategories={mockParsedCategories}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    await waitFor(() => screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(callOrganiseCategories).toHaveBeenCalled();
      expect(mockOnContinue).toHaveBeenCalled();
    });
  });

  it("displays error message if fetching categories fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Fetch failed"));

    render(
      <StepCategories
        parsedCategories={mockParsedCategories}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load existing categories./i)).toBeInTheDocument();
    });
  });

  it("displays error message if organizing categories fails", async () => {
    (callOrganiseCategories as any).mockResolvedValue({
      ok: false,
      error: "Organize failed",
    });

    render(
      <StepCategories
        parsedCategories={mockParsedCategories}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    await waitFor(() => screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(screen.getByText("Organize failed")).toBeInTheDocument();
    });
  });
});
