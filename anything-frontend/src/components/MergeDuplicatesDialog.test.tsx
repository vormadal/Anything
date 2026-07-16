import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { MergeDuplicatesDialog } from "./MergeDuplicatesDialog";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/households/1/lists/suggestions",
}));

const mockMergeMutateAsync = jest.fn();
let mockDuplicatesData: { members: { id: number; name: string; categoryId: number | null; shoppingListId: number | null }[] }[] = [];

jest.mock("@/hooks/useRecommendations", () => ({
  useFindDuplicateRecommendations: () => ({ data: mockDuplicatesData, isLoading: false, isError: false }),
  useMergeRecommendations: () => ({ mutateAsync: mockMergeMutateAsync, isPending: false }),
}));

jest.mock("@/hooks/useSuggestionCategories", () => ({
  useSuggestionCategories: () => ({ data: [] }),
}));

jest.mock("@/hooks/useShoppingLists", () => ({
  useShoppingLists: () => ({ data: [] }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("MergeDuplicatesDialog", () => {
  const onOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDuplicatesData = [
      {
        members: [
          { id: 1, name: "Tomato", categoryId: null, shoppingListId: null },
          { id: 2, name: "Tomatoe", categoryId: null, shoppingListId: null },
        ],
      },
      {
        members: [
          { id: 3, name: "Yoghurt", categoryId: null, shoppingListId: null },
          { id: 4, name: "Yogurt", categoryId: null, shoppingListId: null },
        ],
      },
    ];
  });

  it("shows the first duplicate group with progress", async () => {
    renderWithClient(<MergeDuplicatesDialog open onOpenChange={onOpenChange} />);

    expect(await screen.findByText("Group 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Tomato")).toBeInTheDocument();
    expect(screen.getByText("Tomatoe")).toBeInTheDocument();
  });

  it("merges the group into the default-kept member", async () => {
    const user = userEvent.setup();
    mockMergeMutateAsync.mockResolvedValueOnce(undefined);
    renderWithClient(<MergeDuplicatesDialog open onOpenChange={onOpenChange} />);

    await screen.findByText("Group 1 of 2");
    await user.click(screen.getByRole("button", { name: "Merge" }));

    await waitFor(() =>
      expect(mockMergeMutateAsync).toHaveBeenCalledWith({
        targetId: 1,
        sourceIds: [2],
        name: "Tomato",
        categoryId: null,
      })
    );
  });

  it("keeps the member the user selects", async () => {
    const user = userEvent.setup();
    mockMergeMutateAsync.mockResolvedValueOnce(undefined);
    renderWithClient(<MergeDuplicatesDialog open onOpenChange={onOpenChange} />);

    await screen.findByText("Group 1 of 2");
    // Pick the second member ("Tomatoe") as the one to keep.
    await user.click(screen.getAllByRole("radio")[1]);
    await user.click(screen.getByRole("button", { name: "Merge" }));

    await waitFor(() =>
      expect(mockMergeMutateAsync).toHaveBeenCalledWith({
        targetId: 2,
        sourceIds: [1],
        name: "Tomatoe",
        categoryId: null,
      })
    );
  });

  it("shows an empty state when there are no duplicates", async () => {
    mockDuplicatesData = [];
    renderWithClient(<MergeDuplicatesDialog open onOpenChange={onOpenChange} />);

    expect(await screen.findByText("No similar suggestions found.")).toBeInTheDocument();
  });
});
