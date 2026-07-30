import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import InventoryPage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/inventory",
}));

const mockUnitsGet = jest.fn();
const mockBoxesGet = jest.fn();
const mockItemsGet = jest.fn();
jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      inventoryStorageUnits: { get: (...args: unknown[]) => mockUnitsGet(...args) },
      inventoryBoxes: { get: (...args: unknown[]) => mockBoxesGet(...args) },
      inventoryItems: { get: (...args: unknown[]) => mockItemsGet(...args) },
    },
  },
}));

const places = [
  { id: 1, name: "Summerhouse", type: "Cabin" },
  { id: 2, name: "Basement storage room", type: "Room" },
];
const boxes = [
  { id: 10, number: 4, storageUnitId: 1 },
  { id: 11, number: 7, storageUnitId: 2 },
];
const items = [
  { id: 100, name: "Christmas lights", description: "Warm white", boxId: 10, storageUnitId: 1 },
  { id: 101, name: "Deck chair", description: null, boxId: null, storageUnitId: 1 },
  { id: 102, name: "Tent", description: "Four person", boxId: null, storageUnitId: null },
];

function mockLoaded() {
  mockUnitsGet.mockResolvedValue(places);
  mockBoxesGet.mockResolvedValue(boxes);
  mockItemsGet.mockResolvedValue(items);
}

describe("InventoryPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists places with their box and item counts", async () => {
    mockLoaded();

    renderWithClient(<InventoryPage />);

    await waitFor(() => expect(screen.getByText("Summerhouse")).toBeInTheDocument());
    expect(screen.getByText("Cabin · 1 box · 2 items")).toBeInTheDocument();
    expect(screen.getByText("Room · 1 box · 0 items")).toBeInTheDocument();
    expect(screen.getByText("Summerhouse").closest("a")).toHaveAttribute(
      "href",
      "/inventory/places/1"
    );
  });

  it("surfaces items that have no place so they are not lost", async () => {
    mockLoaded();

    renderWithClient(<InventoryPage />);

    await waitFor(() => expect(screen.getByText("Not placed yet")).toBeInTheDocument());
    expect(screen.getByText("Tent").closest("a")).toHaveAttribute(
      "href",
      "/inventory/items/102"
    );
  });

  it("searches items across every place and shows where each one is", async () => {
    const user = userEvent.setup();
    mockLoaded();

    renderWithClient(<InventoryPage />);
    await waitFor(() => expect(screen.getByText("Summerhouse")).toBeInTheDocument());

    await user.type(screen.getByLabelText("Search all items"), "christmas");

    await waitFor(() => expect(screen.getByText("1 match")).toBeInTheDocument());
    expect(screen.getByText("Summerhouse · Box 4")).toBeInTheDocument();
    // The places section is replaced by results while searching.
    expect(screen.queryByText("Places")).not.toBeInTheDocument();
  });

  it("matches on the description too", async () => {
    const user = userEvent.setup();
    mockLoaded();

    renderWithClient(<InventoryPage />);
    await waitFor(() => expect(screen.getByText("Summerhouse")).toBeInTheDocument());

    await user.type(screen.getByLabelText("Search all items"), "four person");

    await waitFor(() => expect(screen.getByText("Tent")).toBeInTheDocument());
    expect(screen.getByText("1 match")).toBeInTheDocument();
  });

  it("reports when nothing matches the search", async () => {
    const user = userEvent.setup();
    mockLoaded();

    renderWithClient(<InventoryPage />);
    await waitFor(() => expect(screen.getByText("Summerhouse")).toBeInTheDocument());

    await user.type(screen.getByLabelText("Search all items"), "snowboard");

    await waitFor(() =>
      expect(screen.getByText(/No items match/)).toBeInTheDocument()
    );
  });

  it("shows an empty state when nothing is stored yet", async () => {
    mockUnitsGet.mockResolvedValue([]);
    mockBoxesGet.mockResolvedValue([]);
    mockItemsGet.mockResolvedValue([]);

    renderWithClient(<InventoryPage />);

    await waitFor(() =>
      expect(screen.getByText(/Nothing stored yet/)).toBeInTheDocument()
    );
  });

  it("shows an error state when the request fails", async () => {
    mockUnitsGet.mockRejectedValue(new Error("boom"));
    mockBoxesGet.mockResolvedValue([]);
    mockItemsGet.mockResolvedValue([]);

    renderWithClient(<InventoryPage />);

    await waitFor(() =>
      expect(screen.getByText(/Failed to load your storage/)).toBeInTheDocument()
    );
  });

  it("exposes a create-place action in the header", async () => {
    const user = userEvent.setup();
    mockLoaded();

    renderWithClient(<InventoryPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("Create place")).toBeInTheDocument()
    );
    await user.click(screen.getByLabelText("Create place"));

    expect(screen.getByRole("dialog")).toHaveTextContent("New place");
  });
});
