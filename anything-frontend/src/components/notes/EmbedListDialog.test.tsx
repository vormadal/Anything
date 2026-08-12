import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import type { ShoppingListResponse } from "@/lib/api-client/models/index";
import { EmbedListDialog } from "./EmbedListDialog";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/notes/1",
}));

let mockLists: ShoppingListResponse[] = [];
let mockLoading = false;

jest.mock("@/hooks/useShoppingLists", () => ({
  useShoppingLists: () => ({ data: mockLists, isLoading: mockLoading }),
}));

beforeEach(() => {
  mockLoading = false;
  mockLists = [
    { id: 7, name: "Groceries", type: 1, uncheckedItemCount: 2 },
    { id: 8, name: "Packing", type: 0, uncheckedItemCount: 0 },
  ];
});

describe("EmbedListDialog", () => {
  it("reports the picked list and closes", async () => {
    const onSelect = jest.fn();
    const onOpenChange = jest.fn();
    renderWithClient(<EmbedListDialog open onOpenChange={onOpenChange} onSelect={onSelect} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /Packing/ }));

    expect(onSelect).toHaveBeenCalledWith(8, "Packing");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("tells the user when there is nothing to embed", () => {
    mockLists = [];
    renderWithClient(<EmbedListDialog open onOpenChange={jest.fn()} onSelect={jest.fn()} />);

    expect(screen.getByText("No lists yet.")).toBeInTheDocument();
  });
});
