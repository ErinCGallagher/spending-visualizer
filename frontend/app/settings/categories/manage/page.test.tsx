/** Tests for the category management page. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CategoriesManagePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/settings/categories/manage",
}));

const taxonomy = [
  {
    id: "travel-1",
    name: "Travel",
    parentId: null,
    children: [{ id: "accom-1", name: "Accommodation" }],
  },
  {
    id: "food-1",
    name: "Food",
    parentId: null,
    children: [],
  },
];

function mockFetchSequence(responses: { ok: boolean; status?: number; body: unknown }[]) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockImplementationOnce(() =>
      Promise.resolve({
        ok: r.ok,
        status: r.status ?? (r.ok ? 200 : 400),
        json: () => Promise.resolve(r.body),
      })
    );
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

beforeEach(() => {
  vi.resetAllMocks();
});

function rowFor(name: string): HTMLElement {
  return screen.getByText(name, { selector: "span" }).closest("div[class*='group']") as HTMLElement;
}

describe("CategoriesManagePage", () => {
  it("renders loading, then the fetched taxonomy with indented children", async () => {
    mockFetchSequence([{ ok: true, body: taxonomy }]);

    render(<CategoriesManagePage />);

    await waitFor(() => {
      expect(screen.getByText("Travel", { selector: "span" })).toBeInTheDocument();
    });

    expect(screen.getByText("Accommodation", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Food", { selector: "span" })).toBeInTheDocument();
  });

  it("submits the create form and refetches on success", async () => {
    const afterCreate = [
      ...taxonomy,
      { id: "new-1", name: "Shopping", parentId: null, children: [] },
    ];
    const fetchMock = mockFetchSequence([
      { ok: true, body: taxonomy },
      { ok: true, status: 201, body: { id: "new-1", name: "Shopping", parentId: null } },
      { ok: true, body: afterCreate },
    ]);

    render(<CategoriesManagePage />);
    await waitFor(() => expect(screen.getByText("Travel", { selector: "span" })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/category name/i), { target: { value: "Shopping" } });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => expect(screen.getByText("Shopping", { selector: "span" })).toBeInTheDocument());

    const createCall = fetchMock.mock.calls.find((c) => c[1]?.method === "POST");
    expect(createCall?.[0]).toBe("/api/categories");
    expect(JSON.parse(createCall?.[1]?.body)).toEqual({ name: "Shopping", parentId: null });
  });

  it("shows the server's error message inline on a 409 create response", async () => {
    mockFetchSequence([
      { ok: true, body: taxonomy },
      { ok: false, status: 409, body: { error: 'A category named "Travel" already exists there' } },
    ]);

    render(<CategoriesManagePage />);
    await waitFor(() => expect(screen.getByText("Travel", { selector: "span" })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/category name/i), { target: { value: "Travel" } });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('A category named "Travel" already exists there')).toBeInTheDocument();
    });
  });

  it("deletes a category via confirm flow and removes it from the list", async () => {
    const afterDelete = [taxonomy[0]];
    mockFetchSequence([
      { ok: true, body: taxonomy },
      { ok: true, body: { success: true } },
      { ok: true, body: afterDelete },
    ]);

    render(<CategoriesManagePage />);
    await waitFor(() => expect(screen.getByText("Food", { selector: "span" })).toBeInTheDocument());

    const row = rowFor("Food");
    fireEvent.click(row.querySelector("button")!);

    fireEvent.click(await screen.findByText("Yes"));

    await waitFor(() => expect(screen.queryByText("Food", { selector: "span" })).not.toBeInTheDocument());
  });

  it("shows an inline error and keeps the row when delete is blocked by children (409)", async () => {
    mockFetchSequence([
      { ok: true, body: taxonomy },
      { ok: false, status: 409, body: { error: "Delete or move its sub-categories first" } },
    ]);

    render(<CategoriesManagePage />);
    await waitFor(() => expect(screen.getByText("Travel", { selector: "span" })).toBeInTheDocument());

    const row = rowFor("Travel");
    fireEvent.click(row.querySelector("button")!);
    fireEvent.click(await screen.findByText("Yes"));

    await waitFor(() => {
      expect(screen.getByText("Delete or move its sub-categories first")).toBeInTheDocument();
    });
    expect(screen.getByText("Travel", { selector: "span" })).toBeInTheDocument();
  });

  it("only offers top-level categories as parent options", async () => {
    mockFetchSequence([{ ok: true, body: taxonomy }]);

    render(<CategoriesManagePage />);
    await waitFor(() => expect(screen.getByText("Travel", { selector: "span" })).toBeInTheDocument());

    const select = screen.getByLabelText(/parent category/i) as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((o) => o.textContent);

    expect(optionLabels).toContain("Travel");
    expect(optionLabels).toContain("Food");
    expect(optionLabels).not.toContain("Accommodation");
  });
});
