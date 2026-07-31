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
const mockAttachmentsGet = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      inventoryItems: {
        byId: () => ({
          get: mockItemGet,
          delete: jest.fn(),
          put: jest.fn(),
          fields: { put: jest.fn() },
          attachments: {
            get: (...args: unknown[]) => mockAttachmentsGet(...args),
            post: jest.fn(),
            byAttachmentId: () => ({ delete: jest.fn(), download: { get: jest.fn() } }),
          },
        }),
      },
      inventoryBoxes: { get: (...args: unknown[]) => mockBoxesGet(...args) },
      inventoryStorageUnits: { get: (...args: unknown[]) => mockUnitsGet(...args) },
    },
  },
}));

describe("ItemDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAttachmentsGet.mockResolvedValue([]);
  });

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

  it("shows populated metadata fields and a warranty badge", async () => {
    mockItemGet.mockResolvedValue({
      id: 106,
      name: "Drill",
      description: null,
      boxId: null,
      storageUnitId: null,
      quantity: 2,
      brand: "Bosch",
      model: "PSB 750",
      serialNumber: "SN-123",
      purchasedOn: new Date("2024-01-15"),
      purchasePrice: 49.99,
      warrantyExpiresOn: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      notes: "Keep in the garage",
      fields: [],
    });
    mockBoxesGet.mockResolvedValue([]);
    mockUnitsGet.mockResolvedValue([]);

    renderWithClient(<ItemDetailPage />);

    await waitFor(() => expect(screen.getByText("Bosch")).toBeInTheDocument());
    expect(screen.getByText("PSB 750")).toBeInTheDocument();
    expect(screen.getByText("SN-123")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Keep in the garage")).toBeInTheDocument();
    expect(screen.getByText(/Warranty expires in \d+ days?/)).toBeInTheDocument();
  });

  it("omits metadata fields, notes and warranty badge that aren't set", async () => {
    mockItemGet.mockResolvedValue({
      id: 107,
      name: "Plain item",
      description: null,
      boxId: null,
      storageUnitId: null,
      fields: [],
    });
    mockBoxesGet.mockResolvedValue([]);
    mockUnitsGet.mockResolvedValue([]);

    renderWithClient(<ItemDetailPage />);

    await waitFor(() => expect(screen.getByText("Not placed yet")).toBeInTheDocument());
    expect(screen.queryByText(/Warranty expires/)).not.toBeInTheDocument();
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("shows the custom fields editor and the photos/documents sections", async () => {
    mockItemGet.mockResolvedValue({
      id: 108,
      name: "Item with fields",
      description: null,
      boxId: null,
      storageUnitId: null,
      fields: [{ id: 1, label: "Color", value: "Blue", sortOrder: 0 }],
    });
    mockBoxesGet.mockResolvedValue([]);
    mockUnitsGet.mockResolvedValue([]);

    renderWithClient(<ItemDetailPage />);

    await waitFor(() => expect(screen.getByDisplayValue("Color")).toBeInTheDocument());
    expect(screen.getByDisplayValue("Blue")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add photo/ })).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("No documents yet.")).toBeInTheDocument();
  });

  it("shows the item's photos as a hero gallery, like boxes and places", async () => {
    mockItemGet.mockResolvedValue({
      id: 100,
      name: "Christmas lights",
      description: null,
      boxId: null,
      storageUnitId: null,
      fields: [],
    });
    mockBoxesGet.mockResolvedValue([]);
    mockUnitsGet.mockResolvedValue([]);
    mockAttachmentsGet.mockResolvedValue([
      { id: 1, name: "front", contentType: "image/jpeg", kind: "Photo", url: "https://example.com/front.jpg" },
      { id: 2, name: "back", contentType: "image/jpeg", kind: "Photo", url: "https://example.com/back.jpg" },
    ]);

    renderWithClient(<ItemDetailPage />);

    await waitFor(() =>
      expect(screen.getByRole("img", { name: "front" })).toBeInTheDocument()
    );
    expect(screen.getByRole("img", { name: "back" })).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });
});
