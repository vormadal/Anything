import { screen, waitFor } from "@testing-library/react";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import ItemDetailPage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/inventory/items/100",
  useParams: () => ({ id: "100" }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

const mockItemGet = jest.fn();
const mockBoxesGet = jest.fn();
const mockUnitsGet = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      inventoryItems: {
        byId: () => ({ get: mockItemGet, delete: jest.fn(), put: jest.fn() }),
      },
      inventoryBoxes: { get: (...args: unknown[]) => mockBoxesGet(...args) },
      inventoryStorageUnits: { get: (...args: unknown[]) => mockUnitsGet(...args) },
    },
  },
}));

describe("ItemDetailPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the description and location without section headers", async () => {
    mockItemGet.mockResolvedValue({
      id: 100,
      name: "Christmas lights",
      description: "Two strings, warm white",
      boxId: 10,
      storageUnitId: 1,
    });
    mockBoxesGet.mockResolvedValue([{ id: 10, number: 4, storageUnitId: 1 }]);
    mockUnitsGet.mockResolvedValue([{ id: 1, name: "Summerhouse" }]);

    renderWithClient(<ItemDetailPage />);

    await waitFor(() =>
      expect(screen.getByText("Two strings, warm white")).toBeInTheDocument()
    );
    expect(screen.getByRole("link", { name: "Summerhouse" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Box 4" })).toBeInTheDocument();
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
    expect(screen.queryByText("Where it is")).not.toBeInTheDocument();
  });

  it("says the item isn't placed when it has no box or place", async () => {
    mockItemGet.mockResolvedValue({
      id: 105,
      name: "Camping tent",
      description: null,
      boxId: null,
      storageUnitId: null,
    });
    mockBoxesGet.mockResolvedValue([]);
    mockUnitsGet.mockResolvedValue([]);

    renderWithClient(<ItemDetailPage />);

    await waitFor(() => expect(screen.getByText("Not placed yet")).toBeInTheDocument());
  });
});
