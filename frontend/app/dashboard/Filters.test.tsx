import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Filters, { type Meta } from "./Filters";

const mockMeta: Meta = {
  categories: [],
  travellers: ["Erin", "Alice"],
  paymentMethods: [],
  countries: ["Canada", "USA"],
  dateRange: { from: "2024-01-01", to: "2024-12-31" },
  groups: [],
  groupTypes: [
    { value: "trip", label: "Trip" },
    { value: "daily", label: "Daily Living" },
  ],
  overviewDefaultFilter: "trip",
  tripDefaultFilter: null,
  homeCurrency: "CAD",
};

describe("Filters Component", () => {
  it("calls onChange with initial values on mount", async () => {
    const onChange = vi.fn();
    render(
      <Filters
        meta={mockMeta}
        onChange={onChange}
        initialValues={{ groupTypes: ["trip"] }}
      />
    );

    // Should call onChange after the 300ms debounce
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          groupTypes: ["trip"],
        })
      );
    }, { timeout: 1000 });
  });

  it("updates state and calls onChange when date is changed", async () => {
    const onChange = vi.fn();
    render(<Filters meta={mockMeta} onChange={onChange} />);

    const fromInput = screen.getByLabelText(/from/i);
    fireEvent.change(fromInput, { target: { value: "2024-05-01" } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "2024-05-01",
        })
      );
    });
  });

  it("applies presets correctly", async () => {
    const onChange = vi.fn();
    render(<Filters meta={mockMeta} onChange={onChange} />);

    const last30dButton = screen.getByText(/last 30d/i);
    fireEvent.click(last30dButton);

    await waitFor(() => {
      const call = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(call.from).not.toBe("");
      expect(call.to).not.toBe("");
    });
  });
});
