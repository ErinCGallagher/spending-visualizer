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

  it("hides date range and country when showDateRange/showCountry are false", () => {
    render(
      <Filters
        meta={mockMeta}
        onChange={vi.fn()}
        showDateRange={false}
        showCountry={false}
      />
    );

    expect(screen.queryByLabelText(/from/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/to/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Country")).not.toBeInTheDocument();
  });

  it("shows month chips that emit the full month as from/to", async () => {
    const onChange = vi.fn();
    render(
      <Filters
        meta={mockMeta}
        onChange={onChange}
        showDateRange={false}
        showMonth
      />
    );

    const chip = screen.getByText("Feb 2024");
    fireEvent.click(chip);

    await waitFor(() => {
      const call = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(call.from).toBe("2024-02-01");
      expect(call.to).toBe("2024-02-29");
      expect(call.month).toBe("2024-02");
    });
  });

  it("shows an All Months chip that clears the month filter", async () => {
    const onChange = vi.fn();
    render(
      <Filters
        meta={mockMeta}
        onChange={onChange}
        showDateRange={false}
        showMonth
      />
    );

    fireEvent.click(screen.getByText("Feb 2024"));
    await waitFor(() => {
      const call = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(call.from).toBe("2024-02-01");
    });

    fireEvent.click(screen.getByText("All Months"));
    await waitFor(() => {
      const call = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(call.from).toBe("");
      expect(call.to).toBe("");
    });
  });

  it("only allows a single month chip to be selected at a time", () => {
    render(
      <Filters
        meta={mockMeta}
        onChange={vi.fn()}
        showDateRange={false}
        showMonth
      />
    );

    fireEvent.click(screen.getByText("Feb 2024"));
    fireEvent.click(screen.getByText("Mar 2024"));

    expect(screen.getByText("Mar 2024")).toHaveClass("bg-brand-primary");
    expect(screen.getByText("Feb 2024")).not.toHaveClass("bg-brand-primary");
  });

  it("only lists years with data, defaulting to the most recent", () => {
    const multiYearMeta: Meta = {
      ...mockMeta,
      dateRange: { from: "2023-11-01", to: "2024-02-29" },
    };
    render(
      <Filters
        meta={multiYearMeta}
        onChange={vi.fn()}
        showDateRange={false}
        showMonth
      />
    );

    const yearSelect = screen.getByLabelText(/year/i);
    expect(yearSelect).toHaveValue("2024");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["2023", "2024"]);

    expect(screen.getByText("Jan 2024")).toBeInTheDocument();
    expect(screen.getByText("Feb 2024")).toBeInTheDocument();
    expect(screen.queryByText("Nov 2023")).not.toBeInTheDocument();

    fireEvent.change(yearSelect, { target: { value: "2023" } });

    expect(screen.getByText("Nov 2023")).toBeInTheDocument();
    expect(screen.getByText("Dec 2023")).toBeInTheDocument();
    expect(screen.queryByText("Jan 2024")).not.toBeInTheDocument();
  });
});
