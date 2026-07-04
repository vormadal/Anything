import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import UnitsPage from "./page";
import { toast } from "sonner";

const mockUnitsGet = jest.fn();
const mockUnitsPost = jest.fn();
const mockUnitsPut = jest.fn();
const mockUnitsDelete = jest.fn();
const mockSeedDefaultsPost = jest.fn();
const mockExportGet = jest.fn();
const mockImportPost = jest.fn();
const mockUnitsItemById = jest.fn((id: number) => ({
  put: (...args: unknown[]) => mockUnitsPut(id, ...args),
  delete: (...args: unknown[]) => mockUnitsDelete(id, ...args),
}));

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      units: {
        get: (...args: unknown[]) => mockUnitsGet(...args),
        post: (...args: unknown[]) => mockUnitsPost(...args),
        byId: (id: number) => mockUnitsItemById(id),
        seedDefaults: { post: (...args: unknown[]) => mockSeedDefaultsPost(...args) },
        exportEscaped: { get: (...args: unknown[]) => mockExportGet(...args) },
        importEscaped: { post: (...args: unknown[]) => mockImportPost(...args) },
      },
    },
  },
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useParams: () => ({ id: "1" }),
  usePathname: () => "/households/1/units",
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

describe("UnitsPage (household config)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUnitsGet.mockResolvedValue([]);
    mockSeedDefaultsPost.mockResolvedValue(undefined);
    mockUnitsPost.mockResolvedValue(undefined);
    mockUnitsPut.mockResolvedValue(undefined);
    mockUnitsDelete.mockResolvedValue(undefined);
    // Default: current user is a household manager (Owner).
    mockGetHouseholdRole.mockReturnValue("Owner");
  });

  describe("Access Control", () => {
    it("redirects non-manager users", async () => {
      localStorage.setItem("user", regularUser);
      localStorage.setItem("accessToken", "test-token");
      mockGetHouseholdRole.mockReturnValue("Member");

      renderWithClient(<UnitsPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });

    it("renders page for manager users", async () => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");

      renderWithClient(<UnitsPage />);

      await waitFor(() => {
        expect(screen.getByText("No units yet.")).toBeInTheDocument();
      });
    });
  });

  describe("Empty state & seeding defaults", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("offers to add common units when empty and seeds on click", async () => {
      const user = userEvent.setup();

      renderWithClient(<UnitsPage />);

      await waitFor(() => expect(screen.getByText("No units yet.")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Add common units" }));

      await waitFor(() => {
        expect(mockSeedDefaultsPost).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Common units added.");
      });
    });
  });

  describe("Displaying units", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("shows units from the catalog", async () => {
      mockUnitsGet.mockResolvedValue([
        { id: 1, name: "g" },
        { id: 2, name: "kg" },
      ]);

      renderWithClient(<UnitsPage />);

      await waitFor(() => {
        expect(screen.getByText("g")).toBeInTheDocument();
        expect(screen.getByText("kg")).toBeInTheDocument();
      });
    });
  });

  describe("Create unit", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("creates a unit successfully", async () => {
      const user = userEvent.setup();

      renderWithClient(<UnitsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create unit" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create unit" }));
      await user.type(screen.getByLabelText("New unit name"), "tbsp");
      await user.click(screen.getByRole("button", { name: "Save new unit" }));

      await waitFor(() => {
        expect(mockUnitsPost).toHaveBeenCalledWith({ name: "tbsp" });
        expect(toast.success).toHaveBeenCalledWith("Unit created.");
      });
    });

    it("shows error toast when create fails", async () => {
      const user = userEvent.setup();
      mockUnitsPost.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<UnitsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create unit" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create unit" }));
      await user.type(screen.getByLabelText("New unit name"), "tbsp");
      await user.click(screen.getByRole("button", { name: "Save new unit" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create unit.");
      });
    });
  });

  describe("Edit & delete unit", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("saves an edit successfully", async () => {
      const user = userEvent.setup();
      mockUnitsGet.mockResolvedValue([{ id: 1, name: "gram" }]);

      renderWithClient(<UnitsPage />);

      await waitFor(() => expect(screen.getByText("gram")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit unit" }));

      const nameInput = screen.getByDisplayValue("gram");
      await user.clear(nameInput);
      await user.type(nameInput, "g");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(mockUnitsItemById).toHaveBeenCalledWith(1);
        expect(mockUnitsPut).toHaveBeenCalledWith(1, { name: "g" });
        expect(toast.success).toHaveBeenCalledWith("Unit updated.");
      });
    });

    it("deletes a unit successfully", async () => {
      const user = userEvent.setup();
      mockUnitsGet.mockResolvedValue([{ id: 1, name: "g" }]);

      renderWithClient(<UnitsPage />);

      await waitFor(() => expect(screen.getByText("g")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Delete unit" }));

      await waitFor(() => {
        expect(mockUnitsItemById).toHaveBeenCalledWith(1);
        expect(mockUnitsDelete).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Unit deleted.");
      });
    });
  });

  describe("Search", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("filters units by search query", async () => {
      const user = userEvent.setup();
      mockUnitsGet.mockResolvedValue([
        { id: 1, name: "cup" },
        { id: 2, name: "clove" },
        { id: 3, name: "kg" },
      ]);

      renderWithClient(<UnitsPage />);

      await waitFor(() => expect(screen.getByText("cup")).toBeInTheDocument());
      await user.type(screen.getByRole("textbox", { name: "Search units" }), "c");

      await waitFor(() => {
        expect(screen.getByText("cup")).toBeInTheDocument();
        expect(screen.getByText("clove")).toBeInTheDocument();
        expect(screen.queryByText("kg")).not.toBeInTheDocument();
      });
    });
  });

  describe("Export units", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");

      global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
      global.URL.revokeObjectURL = jest.fn();
      const originalCreateElement = document.createElement.bind(document);
      const mockClick = jest.fn();
      jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "a") {
          el.click = mockClick;
        }
        return el;
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("exports units successfully", async () => {
      const user = userEvent.setup();
      mockExportGet.mockResolvedValueOnce({ units: [{ name: "g" }] });

      renderWithClient(<UnitsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Export units" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Export units" }));

      await waitFor(() => {
        expect(mockExportGet).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Units exported.");
      });
    });
  });

  describe("Import units", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("imports units and passes delete flags through", async () => {
      const user = userEvent.setup();
      mockImportPost.mockResolvedValueOnce(undefined);

      renderWithClient(<UnitsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Import units" })).toBeInTheDocument());

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const fileContent = JSON.stringify({ units: [{ name: "g" }, { name: "old", delete: true }] });
      const file = new File([fileContent], "units.json", { type: "application/json" });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockImportPost).toHaveBeenCalledWith({
          units: [{ name: "g" }, { name: "old", delete: true }],
        });
        expect(toast.success).toHaveBeenCalledWith("Units imported.");
      });
    });

    it("shows error toast when import fails", async () => {
      const user = userEvent.setup();
      mockImportPost.mockRejectedValueOnce(new Error("Import failed"));

      renderWithClient(<UnitsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Import units" })).toBeInTheDocument());

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File([JSON.stringify({ units: [{ name: "g" }] })], "units.json", { type: "application/json" });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to import units.");
      });
    });
  });
});
