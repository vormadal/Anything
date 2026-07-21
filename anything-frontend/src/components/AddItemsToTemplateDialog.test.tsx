import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { AddItemsToTemplateDialog } from "./AddItemsToTemplateDialog";
import { toast } from "sonner";

const LIST_ID = 1;
const TEMPLATE_ID = 2;

const mockItemsGetByListId = jest.fn();
const mockCopyPost = jest.fn();
const mockById = jest.fn((id: number) => ({
  items: { get: () => mockItemsGetByListId(id) },
  copyItemsToTemplate: { post: (...args: unknown[]) => mockCopyPost(id, ...args) },
}));

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      checklists: {
        byId: (id: number) => mockById(id),
      },
    },
  },
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

describe("AddItemsToTemplateDialog", () => {
  const onOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockItemsGetByListId.mockImplementation((id: number) =>
      Promise.resolve(
        id === LIST_ID
          ? [
              { id: 10, name: "Milk", shoppingListId: LIST_ID },
              { id: 11, name: "Paper towels", shoppingListId: LIST_ID },
            ]
          : [{ id: 20, name: "Milk", shoppingListId: TEMPLATE_ID }]
      )
    );
  });

  it("only lists items not already in the template", async () => {
    renderWithClient(
      <AddItemsToTemplateDialog
        open
        onOpenChange={onOpenChange}
        listId={LIST_ID}
        templateId={TEMPLATE_ID}
        templateName="Groceries"
      />
    );

    await waitFor(() => expect(screen.getByText("Paper towels")).toBeInTheDocument());
    expect(screen.queryByText("Milk")).not.toBeInTheDocument();
  });

  it("shows an empty state when every item is already in the template", async () => {
    mockItemsGetByListId.mockImplementation((id: number) =>
      Promise.resolve(
        id === LIST_ID
          ? [{ id: 10, name: "Milk", shoppingListId: LIST_ID }]
          : [{ id: 20, name: "Milk", shoppingListId: TEMPLATE_ID }]
      )
    );

    renderWithClient(
      <AddItemsToTemplateDialog
        open
        onOpenChange={onOpenChange}
        listId={LIST_ID}
        templateId={TEMPLATE_ID}
        templateName="Groceries"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("All of this list's items are already in the template.")).toBeInTheDocument();
    });
  });

  it("disables the confirm button until an item is selected", async () => {
    renderWithClient(
      <AddItemsToTemplateDialog
        open
        onOpenChange={onOpenChange}
        listId={LIST_ID}
        templateId={TEMPLATE_ID}
        templateName="Groceries"
      />
    );

    await waitFor(() => expect(screen.getByText("Paper towels")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Add selected items to template" })).toBeDisabled();
  });

  it("copies the selected items into the template", async () => {
    const user = userEvent.setup();
    mockCopyPost.mockResolvedValueOnce(undefined);

    renderWithClient(
      <AddItemsToTemplateDialog
        open
        onOpenChange={onOpenChange}
        listId={LIST_ID}
        templateId={TEMPLATE_ID}
        templateName="Groceries"
      />
    );

    await waitFor(() => expect(screen.getByText("Paper towels")).toBeInTheDocument());
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Add selected items to template" }));

    await waitFor(() => {
      expect(mockCopyPost).toHaveBeenCalledWith(LIST_ID, { itemIds: [11] });
      expect(toast.success).toHaveBeenCalledWith("Items added to template.");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows an error toast when the copy fails", async () => {
    const user = userEvent.setup();
    mockCopyPost.mockRejectedValueOnce(new Error("Server error"));

    renderWithClient(
      <AddItemsToTemplateDialog
        open
        onOpenChange={onOpenChange}
        listId={LIST_ID}
        templateId={TEMPLATE_ID}
        templateName="Groceries"
      />
    );

    await waitFor(() => expect(screen.getByText("Paper towels")).toBeInTheDocument());
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Add selected items to template" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to add items to template. Please try again.");
    });
  });
});
