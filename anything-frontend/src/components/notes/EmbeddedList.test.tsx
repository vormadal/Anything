import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import type { ShoppingList, ShoppingListItem } from "@/lib/api-client/models/index";
import { EmbeddedListCard } from "./EmbeddedList";

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/notes/1",
}));


const mockMutateAsync = jest.fn();

let mockList: ShoppingList | undefined;
let mockItems: ShoppingListItem[] | undefined;
let mockItemsError: Error | null = null;
let mockFetchStatus: "fetching" | "paused" | "idle" = "idle";

jest.mock("@/hooks/useShoppingLists", () => ({
  useShoppingList: () => ({ data: mockList }),
  useShoppingListItems: () => ({
    data: mockItemsError ? undefined : mockItems,
    fetchStatus: mockFetchStatus,
    error: mockItemsError,
  }),
  useUpdateShoppingListItem: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock("@/lib/offline/outboxStore", () => ({
  usePendingItemIds: () => new Set<number>(),
}));

const GROCERIES: ShoppingList = { id: 7, name: "Groceries", type: 1 };

const item = (over: Partial<ShoppingListItem>): ShoppingListItem => ({
  id: 1,
  shoppingListId: 7,
  name: "Milk",
  isChecked: false,
  amount: null,
  unit: null,
  ...over,
});

function renderCard(props: Partial<React.ComponentProps<typeof EmbeddedListCard>> = {}) {
  return renderWithClient(
    <EmbeddedListCard listId={7} label="Groceries" interactive {...props} />
  );
}

beforeEach(() => {
  mockMutateAsync.mockReset().mockResolvedValue({ synced: true });
  mockList = GROCERIES;
  mockItems = [];
  mockItemsError = null;
  mockFetchStatus = "idle";
});

describe("EmbeddedListCard", () => {
  it("lists unchecked items before checked ones", () => {
    mockItems = [
      item({ id: 1, name: "Milk", isChecked: true }),
      item({ id: 2, name: "Bread" }),
    ];
    renderCard();

    const names = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(names).toEqual(["Bread", "Milk"]);
  });

  it("shows the most recently checked item first among checked items", () => {
    mockItems = [
      item({ id: 1, name: "Checked earlier", isChecked: true, modifiedOn: new Date("2024-01-01T00:00:00Z") }),
      item({ id: 2, name: "Unchecked" }),
      item({ id: 3, name: "Checked latest", isChecked: true, modifiedOn: new Date("2024-01-03T00:00:00Z") }),
    ];
    renderCard();

    const names = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(names).toEqual(["Unchecked", "Checked latest", "Checked earlier"]);
  });

  it("keeps the amount and unit when an item is ticked off", async () => {
    mockItems = [item({ id: 3, name: "Flour", amount: 2, unit: "kg" })];
    renderCard();

    await userEvent.setup().click(screen.getByRole("button", { name: "Check item" }));

    // The endpoint replaces the whole item, so a toggle that dropped these
    // would quietly wipe the quantity.
    expect(mockMutateAsync).toHaveBeenCalledWith({
      itemId: 3,
      name: "Flour",
      isChecked: true,
      amount: 2,
      unit: "kg",
    });
  });

  it("shows the quantity prefix for a shopping list", () => {
    mockItems = [item({ id: 3, name: "Flour", amount: 2, unit: "kg" })];
    renderCard();

    // No space between the prefix span and the name — `mr-1` provides the
    // gap, exactly as on the list page.
    expect(screen.getByRole("listitem")).toHaveTextContent("2 kgFlour");
  });

  it("omits the quantity prefix for a general checklist", () => {
    mockList = { id: 7, name: "Packing", type: 0 };
    mockItems = [item({ id: 3, name: "Passport", amount: 2, unit: "kg" })];
    renderCard();

    expect(screen.getByRole("listitem")).toHaveTextContent("Passport");
    expect(screen.getByRole("listitem")).not.toHaveTextContent("2 kg");
  });

  it("renders rows without a working toggle when not interactive", async () => {
    mockItems = [item({ id: 1, name: "Milk" })];
    renderCard({ interactive: false });

    const checkbox = screen.getByRole("button", { name: "Check item" });
    expect(checkbox).toBeDisabled();

    await userEvent.setup().click(checkbox);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("says so when an unseen list is opened offline", () => {
    // Queries pause rather than error offline, so "no data" here is not "no items".
    mockItems = undefined;
    mockFetchStatus = "paused";
    renderCard();

    expect(screen.getByText("This list isn't available offline.")).toBeInTheDocument();
  });

  it("distinguishes a dead connection from a dead list", () => {
    // fetch() rejects with a TypeError when the request never reached a server.
    mockItems = undefined;
    mockItemsError = new TypeError("Failed to fetch");
    renderCard();

    expect(screen.getByText("This list isn't available offline.")).toBeInTheDocument();
  });

  it("falls back to the stored label when the list has been deleted", () => {
    mockList = undefined;
    mockItemsError = new Error("Shopping list not found.");
    renderCard();

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("This list is no longer available.")).toBeInTheDocument();
  });

  it("offers to remove the embed only when the note is editable", () => {
    mockItems = [item({})];
    const onRemove = jest.fn();
    const { rerender } = renderCard({ onRemove });

    expect(screen.getByRole("button", { name: "Remove list from note" })).toBeInTheDocument();

    rerender(<EmbeddedListCard listId={7} label="Groceries" interactive={false} />);
    expect(screen.queryByRole("button", { name: "Remove list from note" })).not.toBeInTheDocument();
  });
});
