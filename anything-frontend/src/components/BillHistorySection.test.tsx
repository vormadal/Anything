import { screen, fireEvent } from "@testing-library/react";
import { render } from "@/__tests__/utils/test-utils";
import { BillHistorySection } from "./BillHistorySection";
import type { BillPriceHistoryResponse, BillAmountEntryResponse } from "@/hooks/useBills";

// renderWithClient mounts LeftActionSlot, which calls useSmartBack() -> useRouter()/usePathname().
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/bills/1",
}));

function priceHistoryProps(overrides: Partial<React.ComponentProps<typeof BillHistorySection>["priceHistory"]> = {}) {
  return {
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

function amountEntriesProps(overrides: Partial<React.ComponentProps<typeof BillHistorySection>["amountEntries"]> = {}) {
  return {
    entries: [] as BillAmountEntryResponse[],
    isLoading: false,
    isAdding: false,
    onToggleAdd: jest.fn(),
    amount: "",
    onAmountChange: jest.fn(),
    date: "2025-01-01",
    onDateChange: jest.fn(),
    notes: "",
    onNotesChange: jest.fn(),
    onSubmit: jest.fn(),
    isPending: false,
    ...overrides,
  };
}

describe("BillHistorySection", () => {
  it("shows a plain History header with no tabs for a fixed-amount bill", () => {
    render(
      <BillHistorySection
        hasVariableAmount={false}
        isOnline={true}
        priceHistory={priceHistoryProps()}
        amountEntries={amountEntriesProps()}
      />
    );

    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.queryByText("Amount entries")).not.toBeInTheDocument();
  });

  it("shows tabs and defaults to Amount entries for a variable-amount bill", () => {
    render(
      <BillHistorySection
        hasVariableAmount={true}
        isOnline={true}
        priceHistory={priceHistoryProps({
          entries: [{ id: 1, billId: 1, amount: 10, effectiveDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" }],
        })}
        amountEntries={amountEntriesProps({
          entries: [{ id: 1, billId: 1, amount: 20, periodDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" }],
        })}
      />
    );

    // Amount entries (20 kr., in both the average line and the entry itself)
    // shown by default, not the price history entry (10 kr.).
    expect(screen.getAllByText(/20,00/).length).toBe(2);
    expect(screen.queryByText(/10,00/)).not.toBeInTheDocument();
  });

  it("switches tabs and calls the right Add entry handler per tab", () => {
    const onTogglePrice = jest.fn();
    const onToggleAmount = jest.fn();
    render(
      <BillHistorySection
        hasVariableAmount={true}
        isOnline={true}
        priceHistory={priceHistoryProps({ onToggleAdd: onTogglePrice })}
        amountEntries={amountEntriesProps({ onToggleAdd: onToggleAmount })}
      />
    );

    fireEvent.click(screen.getByText("Add entry"));
    expect(onToggleAmount).toHaveBeenCalledTimes(1);
    expect(onTogglePrice).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Price history"));
    fireEvent.click(screen.getByText("Add entry"));
    expect(onTogglePrice).toHaveBeenCalledTimes(1);
  });

  it("computes the average across amount entries, singular for one entry", () => {
    const { rerender } = render(
      <BillHistorySection
        hasVariableAmount={true}
        isOnline={true}
        priceHistory={priceHistoryProps()}
        amountEntries={amountEntriesProps({
          entries: [
            { id: 1, billId: 1, amount: 40, periodDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" },
            { id: 2, billId: 1, amount: 60, periodDate: "2025-02-01T00:00:00Z", createdOn: "2025-02-01T00:00:00Z" },
          ],
        })}
      />
    );

    expect(screen.getByText(/Average.*over 2 entries/)).toBeInTheDocument();

    rerender(
      <BillHistorySection
        hasVariableAmount={true}
        isOnline={true}
        priceHistory={priceHistoryProps()}
        amountEntries={amountEntriesProps({
          entries: [{ id: 1, billId: 1, amount: 40, periodDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" }],
        })}
      />
    );

    expect(screen.getByText(/Average.*over 1 entry\b/)).toBeInTheDocument();
  });

  it("shows a price increase badge and a price decrease badge", () => {
    render(
      <BillHistorySection
        hasVariableAmount={false}
        isOnline={true}
        priceHistory={priceHistoryProps({
          entries: [
            { id: 1, billId: 1, amount: 120, previousAmount: 100, effectiveDate: "2025-02-01T00:00:00Z", createdOn: "2025-02-01T00:00:00Z" },
            { id: 2, billId: 1, amount: 80, previousAmount: 100, effectiveDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" },
          ],
        })}
        amountEntries={amountEntriesProps()}
      />
    );

    expect(screen.getByText(/\+20\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/-20\.0%/)).toBeInTheDocument();
  });

  it("falls back to an absolute-amount badge when the previous price was zero", () => {
    render(
      <BillHistorySection
        hasVariableAmount={false}
        isOnline={true}
        priceHistory={priceHistoryProps({
          entries: [{ id: 1, billId: 1, amount: 50, previousAmount: 0, effectiveDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" }],
        })}
        amountEntries={amountEntriesProps()}
      />
    );

    expect(screen.getByText(/\+.*50,00/)).toBeInTheDocument();
  });

  it("deletes a price entry when its delete button is clicked", () => {
    const onDelete = jest.fn();
    render(
      <BillHistorySection
        hasVariableAmount={false}
        isOnline={true}
        priceHistory={priceHistoryProps({
          entries: [{ id: 7, billId: 1, amount: 50, effectiveDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" }],
          onDelete,
        })}
        amountEntries={amountEntriesProps()}
      />
    );

    fireEvent.click(screen.getByLabelText("Delete price entry"));
    expect(onDelete).toHaveBeenCalledWith(7);
  });

  it("disables the delete button while offline", () => {
    render(
      <BillHistorySection
        hasVariableAmount={false}
        isOnline={false}
        priceHistory={priceHistoryProps({
          entries: [{ id: 7, billId: 1, amount: 50, effectiveDate: "2025-01-01T00:00:00Z", createdOn: "2025-01-01T00:00:00Z" }],
        })}
        amountEntries={amountEntriesProps()}
      />
    );

    expect(screen.getByLabelText("Delete price entry")).toBeDisabled();
  });
});
