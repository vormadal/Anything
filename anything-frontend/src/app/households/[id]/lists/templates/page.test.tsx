import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import TemplatesPage from "./page";
import { toast } from "sonner";

const mockTemplatesGet = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockById = jest.fn((id: number) => ({
  put: (...args: unknown[]) => mockPut(id, ...args),
  delete: (...args: unknown[]) => mockDelete(id, ...args),
}));

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      checklists: {
        templates: { get: (...args: unknown[]) => mockTemplatesGet(...args) },
        byId: (id: number) => mockById(id),
      },
    },
  },
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useParams: () => ({ id: "1" }),
  usePathname: () => "/households/1/lists/templates",
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
const regularUser = JSON.stringify({ email: "user@test.com", name: "User", role: "User" });

function signInAsManager() {
  localStorage.setItem("user", adminUser);
  localStorage.setItem("accessToken", "test-token");
}

describe("TemplatesPage (household config)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockTemplatesGet.mockResolvedValue([]);
    mockPut.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);
    mockGetHouseholdRole.mockReturnValue("Owner");
  });

  describe("Access control", () => {
    it("redirects non-manager users", async () => {
      localStorage.setItem("user", regularUser);
      localStorage.setItem("accessToken", "test-token");
      mockGetHouseholdRole.mockReturnValue("Member");

      renderWithClient(<TemplatesPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });

    it("shows the empty state for managers with no templates", async () => {
      signInAsManager();

      renderWithClient(<TemplatesPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/No templates yet\./i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Listing templates", () => {
    beforeEach(signInAsManager);

    it("renders templates with their item counts", async () => {
      mockTemplatesGet.mockResolvedValue([
        { id: 5, name: "Groceries", type: 1, itemCount: 3 },
        { id: 6, name: "Packing", type: 0, itemCount: 1 },
      ]);

      renderWithClient(<TemplatesPage />);

      await waitFor(() => {
        expect(screen.getByText("Groceries")).toBeInTheDocument();
        expect(screen.getByText("Packing")).toBeInTheDocument();
      });
      expect(screen.getByText("3 items")).toBeInTheDocument();
      expect(screen.getByText("1 item")).toBeInTheDocument();
    });

    it("navigates to the detail page when a template row is opened", async () => {
      const user = userEvent.setup();
      mockTemplatesGet.mockResolvedValue([{ id: 5, name: "Groceries", type: 1, itemCount: 3 }]);

      renderWithClient(<TemplatesPage />);

      await waitFor(() => expect(screen.getByText("Groceries")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit template Groceries" }));

      expect(mockPush).toHaveBeenCalledWith("/households/1/lists/templates/5");
    });
  });

  describe("Rename template", () => {
    beforeEach(signInAsManager);

    it("renames a template successfully", async () => {
      const user = userEvent.setup();
      mockTemplatesGet.mockResolvedValue([{ id: 5, name: "Groceries", type: 1, itemCount: 3 }]);

      renderWithClient(<TemplatesPage />);

      await waitFor(() => expect(screen.getByText("Groceries")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Rename template Groceries" }));

      const input = await screen.findByRole("textbox", { name: "Edit list name" });
      await user.clear(input);
      await user.type(input, "Weekly shop");
      await user.click(screen.getByRole("button", { name: "Save list name" }));

      await waitFor(() => {
        expect(mockById).toHaveBeenCalledWith(5);
        expect(mockPut).toHaveBeenCalledWith(5, { name: "Weekly shop" });
        expect(toast.success).toHaveBeenCalledWith("Template renamed.");
      });
    });

    it("shows an error toast when rename fails", async () => {
      const user = userEvent.setup();
      mockPut.mockRejectedValueOnce(new Error("Server error"));
      mockTemplatesGet.mockResolvedValue([{ id: 5, name: "Groceries", type: 1, itemCount: 3 }]);

      renderWithClient(<TemplatesPage />);

      await waitFor(() => expect(screen.getByText("Groceries")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Rename template Groceries" }));

      const input = await screen.findByRole("textbox", { name: "Edit list name" });
      await user.clear(input);
      await user.type(input, "Weekly shop");
      await user.click(screen.getByRole("button", { name: "Save list name" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to rename template.");
      });
    });
  });

  describe("Delete template", () => {
    beforeEach(signInAsManager);

    it("deletes a template after confirmation", async () => {
      const user = userEvent.setup();
      mockTemplatesGet.mockResolvedValue([{ id: 5, name: "Groceries", type: 1, itemCount: 3 }]);

      renderWithClient(<TemplatesPage />);

      await waitFor(() => expect(screen.getByText("Groceries")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Delete template Groceries" }));

      await user.click(await screen.findByRole("button", { name: "Confirm delete template" }));

      await waitFor(() => {
        expect(mockById).toHaveBeenCalledWith(5);
        expect(mockDelete).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Template deleted.");
      });
    });
  });
});
