import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ShoppingListItem } from "@/lib/api-client/models/index";
import { ChecklistItemRow } from "./ChecklistItemRow";

const item = (over: Partial<ShoppingListItem>): ShoppingListItem => ({
  id: 1,
  shoppingListId: 7,
  name: "Milk",
  isChecked: false,
  amount: null,
  unit: null,
  ...over,
});

function renderRow(props: Partial<React.ComponentProps<typeof ChecklistItemRow>> = {}) {
  return render(
    <ul>
      <ChecklistItemRow item={item({})} {...props} />
    </ul>
  );
}

describe("ChecklistItemRow", () => {
  it("carries a data-flip-id matching the item's id, for FLIP reorder animation", () => {
    renderRow({ item: item({ id: 42 }) });
    expect(screen.getByRole("listitem")).toHaveAttribute("data-flip-id", "42");
  });

  it("renders an unchecked row with a Check item button", () => {
    renderRow({ item: item({ isChecked: false }) });

    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check item" })).toBeInTheDocument();
    expect(screen.getByText("Milk")).not.toHaveClass("line-through");
  });

  it("renders a checked row struck through with an Uncheck item button", () => {
    renderRow({ item: item({ isChecked: true }) });

    expect(screen.getByRole("button", { name: "Uncheck item" })).toBeInTheDocument();
    expect(screen.getByText("Milk")).toHaveClass("line-through");
  });

  it("calls onToggle with the item when the checkbox is clicked", async () => {
    const onToggle = jest.fn();
    const theItem = item({ id: 3 });
    renderRow({ item: theItem, onToggle });

    await userEvent.setup().click(screen.getByRole("button", { name: "Check item" }));

    expect(onToggle).toHaveBeenCalledWith(theItem);
  });

  it("disables the checkbox when there is no onToggle (read-only surfaces)", () => {
    renderRow({ onToggle: undefined });
    expect(screen.getByRole("button", { name: "Check item" })).toBeDisabled();
  });

  it("disables the checkbox when disabled is set, even with onToggle present", () => {
    renderRow({ onToggle: jest.fn(), disabled: true });
    expect(screen.getByRole("button", { name: "Check item" })).toBeDisabled();
  });

  it("shows the quantity prefix only when showQuantity is set", () => {
    const withAmount = item({ amount: 2, unit: "l" });

    const { rerender } = render(
      <ul>
        <ChecklistItemRow item={withAmount} showQuantity />
      </ul>
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("2 lMilk");

    rerender(
      <ul>
        <ChecklistItemRow item={withAmount} showQuantity={false} />
      </ul>
    );
    expect(screen.getByRole("listitem")).not.toHaveTextContent("2 l");
  });

  it("falls back to a bare multiplier when there is no unit", () => {
    renderRow({ item: item({ amount: 3, unit: null }), showQuantity: true });
    expect(screen.getByRole("listitem")).toHaveTextContent("3×Milk");
  });

  it("shows a pending-sync indicator only when pending", () => {
    const { rerender } = render(
      <ul>
        <ChecklistItemRow item={item({})} pending />
      </ul>
    );
    expect(screen.getByLabelText("Pending sync")).toBeInTheDocument();

    rerender(
      <ul>
        <ChecklistItemRow item={item({})} pending={false} />
      </ul>
    );
    expect(screen.queryByLabelText("Pending sync")).not.toBeInTheDocument();
  });
});
