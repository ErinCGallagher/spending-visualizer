import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StepFilePicker from "./StepFilePicker";

describe("StepFilePicker", () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders correctly", () => {
    render(<StepFilePicker onSuccess={mockOnSuccess} />);
    expect(screen.getByText(/Upload your CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag & drop your CSV file here/i)).toBeInTheDocument();
  });

  it("updates parser selection", () => {
    render(<StepFilePicker onSuccess={mockOnSuccess} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "wealthsimple" } });
    expect(select.value).toBe("wealthsimple");
  });

  it("handles file selection via input", async () => {
    const { container } = render(<StepFilePicker onSuccess={mockOnSuccess} />);
    
    const file = new File(["test data"], "test.csv", { type: "text/csv" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("test.csv")).toBeInTheDocument();
      expect(screen.getByText("Change file")).toBeInTheDocument();
    });
  });

  it("clears file when 'Change file' is clicked", async () => {
    const { container } = render(<StepFilePicker onSuccess={mockOnSuccess} />);
    
    const file = new File(["test data"], "test.csv", { type: "text/csv" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("test.csv")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Change file"));
    
    expect(screen.queryByText("test.csv")).not.toBeInTheDocument();
    expect(screen.getByText(/Drag & drop your CSV file here/i)).toBeInTheDocument();
  });

  it("submits the file and calls onSuccess", async () => {
    const mockResponse = {
      transactions: [],
      summary: { totalCount: 0, totalAmount: 0 },
    };
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { container } = render(<StepFilePicker onSuccess={mockOnSuccess} />);
    
    const file = new File(["test data"], "test.csv", { type: "text/csv" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("test.csv")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/uploads", expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }));
      expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse, file);
    });
  });

  it("displays error message on upload failure", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Invalid file format" }),
    });

    const { container } = render(<StepFilePicker onSuccess={mockOnSuccess} />);
    
    const file = new File(["test data"], "test.csv", { type: "text/csv" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("test.csv")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid file format")).toBeInTheDocument();
    });
    
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
