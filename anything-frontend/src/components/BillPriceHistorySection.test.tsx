import { screen, fireEvent } from "@testing-library/react";
import { render } from "@/__tests__/utils/test-utils";
import { BillPriceHistorySection } from "./BillPriceHistorySection";
import type { BillPriceHistoryResponse } from "@/hooks/useBills";

// renderWithClient mounts LeftActionSlot, which calls useSmartBack() -> useRouter()/usePathname().
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/bills/1",
}));

function baseProps(overrides: Partial<React.ComponentProps<typeof BillPriceHistorySection>> = {}) {
  return {
    isOnline: true,
    entries: [] as BillPriceHistoryResponse[],
    isLoading: false,
    isAdding: false,
    onToggleAdd: jest.fn(),
    amount: "",
    onAmountChange: jest.fn(),
    date: "2025-01-01",
    onDateChange: jest.fn(),
    endDate: "",
    onEndDateChange: jest.fn(),
    notes: "",
    onNotesChange: jest.fn(),
    onSubmit: jest.fn(),
    isPending: false,
    onDelete: jest.fn(),
    ...overrides,
  };
}

describe("BillPriceHistorySection", () => {
  it("shows the empty state when there are no entries", () => {
    render(<BillPriceHistorySection {...baseProps()} />);

    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("No price entries yet.")).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    render(<BillPriceHistorySection {...baseProps({ isLoading: true })} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("No price entries yet.")).not.toBeInTheDocument();
  });

  it("toggles the add-entry form", () => {
    const onToggleAdd = jest.fn();
    render(<BillPriceHistorySection {...baseProps({ onToggleAdd })} />);

    fireEvent.click(screen.getByText("Add entry"));
    expect(onToggleAdd).toHaveBeenCalledTimes(1);
  });

  it("shows a price increase badge and a price decrease badge", () => {
    render(
      <BillPriceHistorySection
        {...baseProps({
          entries: [
            { id: 1, billId: 1, amount: 120, previousAmount: 100, effectiveDate: "2025-02-01T00:00:00Z", createdOn: "2025-02-01T00:00:00Z" },
            { id: 2, billId: 1, amount: 80, previousAmount: 100, effectiveDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" },
          ],
        })}
      />
    );

    expect(screen.getByText(/\+20\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/-20\.0%/)).toBeInTheDocument();
  });

  it("shows a flat 0% badge when the amount didn't change", () => {
    render(
      <BillPriceHistorySection
        {...baseProps({
          entries: [{ id: 1, billId: 1, amount: 100, previousAmount: 100, effectiveDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" }],
        })}
      />
    );

    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("falls back to an absolute-amount badge when the previous price was zero", () => {
    render(
      <BillPriceHistorySection
        {...baseProps({
          entries: [{ id: 1, billId: 1, amount: 50, previousAmount: 0, effectiveDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" }],
        })}
      />
    );

    expect(screen.getByText(/\+.*50,00/)).toBeInTheDocument();
  });

  it("shows no badge when there's no previous amount", () => {
    render(
      <BillPriceHistorySection
        {...baseProps({
          entries: [{ id: 1, billId: 1, amount: 50, effectiveDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" }],
        })}
      />
    );

    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("deletes a price entry when its delete button is clicked", () => {
    const onDelete = jest.fn();
    render(
      <BillPriceHistorySection
        {...baseProps({
          entries: [{ id: 7, billId: 1, amount: 50, effectiveDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" }],
          onDelete,
        })}
      />
    );

    fireEvent.click(screen.getByLabelText("Delete price entry"));
    expect(onDelete).toHaveBeenCalledWith(7);
  });

  it("disables the delete button while offline", () => {
    render(
      <BillPriceHistorySection
        {...baseProps({
          isOnline: false,
          entries: [{ id: 7, billId: 1, amount: 50, effectiveDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" }],
        })}
      />
    );

    expect(screen.getByLabelText("Delete price entry")).toBeDisabled();
  });

  it("shows the add-entry form with the end-date field when isAdding is true", () => {
    render(<BillPriceHistorySection {...baseProps({ isAdding: true })} />);

    expect(screen.getByPlaceholderText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Valid until (optional)")).toBeInTheDocument();
  });
});
