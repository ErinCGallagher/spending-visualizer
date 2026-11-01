import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Filters, { defaultYearRange, type Meta } from "./Filters";

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
      expect(call.months).toEqual(["2024-02"]);
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

  it("selects contiguous months as one range and toggles them off when tapped again", async () => {
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
    fireEvent.click(screen.getByText("Mar 2024"));

    expect(screen.getByText("Feb 2024")).toHaveClass("bg-brand-primary");
    expect(screen.getByText("Mar 2024")).toHaveClass("bg-brand-primary");
    await waitFor(() => {
      const call = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(call).toEqual(
        expect.objectContaining({ from: "2024-02-01", to: "2024-03-31", months: ["2024-02", "2024-03"] })
      );
    });

    fireEvent.click(screen.getByText("Feb 2024"));
    expect(screen.getByText("Feb 2024")).not.toHaveClass("bg-brand-primary");
    expect(screen.getByText("Mar 2024")).toHaveClass("bg-brand-primary");
  });

  it("restarts the selection when a non-adjacent month is tapped", () => {
    render(
      <Filters
        meta={mockMeta}
        onChange={vi.fn()}
        showDateRange={false}
        showMonth
      />
    );

    fireEvent.click(screen.getByText("Feb 2024"));
    fireEvent.click(screen.getByText("Jun 2024"));

    expect(screen.getByText("Jun 2024")).toHaveClass("bg-brand-primary");
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

  describe("filterByYear", () => {
    const multiYearMeta: Meta = {
      ...mockMeta,
      dateRange: { from: "2023-11-01", to: "2024-02-29" },
    };

    function renderByYear(onChange = vi.fn()) {
      render(
        <Filters
          meta={multiYearMeta}
          onChange={onChange}
          showTravellers={false}
          showDateRange={false}
          showCountry={false}
          showMonth
          filterByYear
        />
      );
      return onChange;
    }

    function lastEmitted(onChange: ReturnType<typeof vi.fn>) {
      return onChange.mock.calls[onChange.mock.calls.length - 1][0];
    }

    it("offers All years first and starts unbounded", async () => {
      const onChange = renderByYear();

      const yearSelect = screen.getByLabelText(/year/i);
      expect(yearSelect).toHaveValue("");
      expect(
        [...(yearSelect as HTMLSelectElement).options].map((o) => o.textContent)
      ).toEqual(["All years", "2023", "2024"]);

      await waitFor(() => {
        expect(lastEmitted(onChange)).toEqual(expect.objectContaining({ from: "", to: "" }));
      });
    });

    it("filters to the whole year when a year is chosen", async () => {
      const onChange = renderByYear();

      fireEvent.change(screen.getByLabelText(/year/i), { target: { value: "2023" } });

      await waitFor(() => {
        expect(lastEmitted(onChange)).toEqual(
          expect.objectContaining({ from: "2023-01-01", to: "2023-12-31", months: [] })
        );
      });
    });

    it("only shows month chips once a year is chosen", () => {
      renderByYear();

      expect(screen.queryByText("All Months")).not.toBeInTheDocument();
      expect(screen.queryByText("Nov 2023")).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/year/i), { target: { value: "2023" } });

      expect(screen.getByText("All Months")).toBeInTheDocument();
      expect(screen.getByText("Nov 2023")).toBeInTheDocument();
      expect(screen.queryByText("Jan 2024")).not.toBeInTheDocument();
    });

    it("narrows to a month within the year and returns to the year on All Months", async () => {
      const onChange = renderByYear();
      fireEvent.change(screen.getByLabelText(/year/i), { target: { value: "2023" } });

      fireEvent.click(screen.getByText("Nov 2023"));
      await waitFor(() => {
        expect(lastEmitted(onChange)).toEqual(
          expect.objectContaining({ from: "2023-11-01", to: "2023-11-30", months: ["2023-11"] })
        );
      });

      fireEvent.click(screen.getByText("All Months"));
      await waitFor(() => {
        expect(lastEmitted(onChange)).toEqual(
          expect.objectContaining({ from: "2023-01-01", to: "2023-12-31", months: [] })
        );
      });
    });

    it("resets the month when the year changes", async () => {
      const onChange = renderByYear();
      fireEvent.change(screen.getByLabelText(/year/i), { target: { value: "2023" } });
      fireEvent.click(screen.getByText("Nov 2023"));

      fireEvent.change(screen.getByLabelText(/year/i), { target: { value: "2024" } });

      await waitFor(() => {
        expect(lastEmitted(onChange)).toEqual(
          expect.objectContaining({ from: "2024-01-01", to: "2024-12-31", months: [] })
        );
      });
    });

    it("clears the range when All years is chosen again", async () => {
      const onChange = renderByYear();
      fireEvent.change(screen.getByLabelText(/year/i), { target: { value: "2023" } });
      fireEvent.change(screen.getByLabelText(/year/i), { target: { value: "" } });

      await waitFor(() => {
        expect(lastEmitted(onChange)).toEqual(
          expect.objectContaining({ from: "", to: "", months: [] })
        );
      });
    });

    it("starts on the year of the initial range", async () => {
      const onChange = vi.fn();
      render(
        <Filters
          meta={multiYearMeta}
          onChange={onChange}
          showDateRange={false}
          showMonth
          filterByYear
          initialValues={{ from: "2024-01-01", to: "2024-12-31" }}
        />
      );

      expect(screen.getByLabelText(/year/i)).toHaveValue("2024");
      expect(screen.getByText("Feb 2024")).toBeInTheDocument();
      await waitFor(() => {
        expect(lastEmitted(onChange)).toEqual(
          expect.objectContaining({ from: "2024-01-01", to: "2024-12-31" })
        );
      });
    });

    it("puts group type after the months, in the same row, with the months filling the middle", () => {
      renderByYear();
      fireEvent.change(screen.getByLabelText(/year/i), { target: { value: "2023" } });

      const row = screen.getByLabelText(/year/i).closest(".flex-wrap")!;
      const groupType = screen.getByText("Group Type");
      const lastChip = screen.getByText("Dec 2023");

      expect(row).toContainElement(groupType);
      expect(lastChip.compareDocumentPosition(groupType) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getByText("Month").parentElement).toHaveClass("flex-1");
    });

    it("drops the quick range, date pickers and country but keeps group type", () => {
      renderByYear();

      expect(screen.queryByText("Quick range")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("To")).not.toBeInTheDocument();
      expect(screen.queryByText("Country")).not.toBeInTheDocument();
      expect(screen.getByText("Group Type")).toBeInTheDocument();
    });
  });
});

describe("defaultYearRange", () => {
  const range = { from: "2023-11-01", to: "2026-03-31" };

  it("is the current year when it has data", () => {
    expect(defaultYearRange(range, new Date(2025, 5, 1))).toEqual({
      from: "2025-01-01",
      to: "2025-12-31",
    });
  });

  it("falls back to the most recent year with data", () => {
    expect(defaultYearRange(range, new Date(2030, 0, 1))).toEqual({
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });

  it("is unbounded when there is no data", () => {
    expect(defaultYearRange(null, new Date(2026, 0, 1))).toEqual({ from: "", to: "" });
  });
});
