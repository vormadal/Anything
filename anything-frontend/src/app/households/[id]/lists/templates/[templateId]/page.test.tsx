import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/__tests__/utils/test-utils";
import TemplateDetailPage from "./page";
import { toast } from "sonner";

const mockGet = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockById = jest.fn((id: number) => ({
  get: (...args: unknown[]) => mockGet(id, ...args),
  put: (...args: unknown[]) => mockPut(id, ...args),
  delete: (...args: unknown[]) => mockDelete(id, ...args),
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

// The item-editing UIs are covered by their own tests; stub them so this test
// focuses on the template detail shell (title, rename, delete).
jest.mock("@/app/lists/[id]/GeneralChecklistEditMode", () => ({
  GeneralChecklistEditMode: ({ listId }: { listId: number }) => (
    <div data-testid="general-edit">general {listId}</div>
  ),
}));
jest.mock("@/app/shopping-lists/[id]/ShoppingListEditMode", () => ({
  ShoppingListEditMode: ({ listId }: { listId: number }) => (
    <div data-testid="shopping-edit">shopping {listId}</div>
  ),
}));

const mockPush = jest.fn();
const mockRouter = { push: mockPush, back: jest.fn() };
jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ id: "1", templateId: "5" }),
  usePathname: () => "/households/1/lists/templates/5",
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

const mockGetHouseholdRole = jest.fn();
jest.mock("@/context/HouseholdContext", () => ({
  useHouseholdContext: () => ({
    getHouseholdRole: mockGetHouseholdRole,
    isLoading: false,
    households: [],
    selectedHouseholdId: 1,
    setSelectedHouseholdId: jest.fn(),
    currentHouseholdRole: undefined,
  }),
}));

const adminUser = JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" });

describe("TemplateDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("user", adminUser);
    localStorage.setItem("accessToken", "test-token");
    mockPut.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);
    mockGetHouseholdRole.mockReturnValue("Owner");
  });

  it("redirects non-manager users", async () => {
    mockGetHouseholdRole.mockReturnValue("Member");
    mockGet.mockResolvedValue({ id: 5, name: "Groceries", type: 1 });

    render(<TemplateDetailPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("renders the shopping item editor for a Shopping template (type=1)", async () => {
    mockGet.mockResolvedValue({ id: 5, name: "Groceries", type: 1 });

    render(<TemplateDetailPage />);

    await waitFor(() => expect(screen.getByText("Groceries")).toBeInTheDocument());
    expect(screen.getByTestId("shopping-edit")).toHaveTextContent("shopping 5");
  });

  it("renders the checklist item editor for a General template (type=0)", async () => {
    mockGet.mockResolvedValue({ id: 5, name: "Packing", type: 0 });

    render(<TemplateDetailPage />);

    await waitFor(() => expect(screen.getByText("Packing")).toBeInTheDocument());
    expect(screen.getByTestId("general-edit")).toHaveTextContent("general 5");
  });

  it("renames the template from the action menu", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ id: 5, name: "Old", type: 1 });

    render(<TemplateDetailPage />);

    await waitFor(() => expect(screen.getByText("Old")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(screen.getByText("Rename"));

    const input = await screen.findByRole("textbox", { name: "Edit list name" });
    await user.clear(input);
    await user.type(input, "New name");
    await user.click(screen.getByRole("button", { name: "Save list name" }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(5, { name: "New name" });
    });
  });

  it("deletes the template and navigates back to the templates list", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ id: 5, name: "Groceries", type: 1 });

    render(<TemplateDetailPage />);

    await waitFor(() => expect(screen.getByText("Groceries")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(screen.getByText("Delete template"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Template deleted.");
      expect(mockPush).toHaveBeenCalledWith("/households/1/lists/templates");
    });
  });
});
