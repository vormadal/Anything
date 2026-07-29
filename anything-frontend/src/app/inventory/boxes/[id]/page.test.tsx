import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import BoxDetailPage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/inventory/boxes/10",
  useParams: () => ({ id: "10" }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

const mockBoxGet = jest.fn();
const mockBoxesGet = jest.fn();
const mockItemsGet = jest.fn();
const mockUnitsGet = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      inventoryBoxes: {
        get: (...args: unknown[]) => mockBoxesGet(...args),
        byId: () => ({ get: mockBoxGet, delete: jest.fn(), put: jest.fn() }),
      },
      inventoryItems: { get: (...args: unknown[]) => mockItemsGet(...args) },
      inventoryStorageUnits: { get: (...args: unknown[]) => mockUnitsGet(...args) },
    },
  },
}));

const box = { id: 10, number: 4, storageUnitId: 1 };

function mockLoaded() {
  mockBoxGet.mockResolvedValue(box);
  mockBoxesGet.mockResolvedValue([box]);
  mockUnitsGet.mockResolvedValue([{ id: 1, name: "Summerhouse" }]);
  mockItemsGet.mockResolvedValue([
    { id: 100, name: "Christmas lights", description: "Warm white", boxId: 10, storageUnitId: 1 },
  ]);
}

describe("BoxDetailPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("puts the place link and the add-item action in the same row, action on the right", async () => {
    mockLoaded();

    renderWithClient(<BoxDetailPage />);

    await waitFor(() => expect(screen.getByText("Summerhouse")).toBeInTheDocument());
    const addButton = screen.getByRole("button", { name: /Add item/ });
    const placeLink = screen.getByRole("link", { name: "Summerhouse" });

    // Same flex row, place first (left) then the action (right).
    expect(placeLink.parentElement).toBe(addButton.parentElement);
    const children = Array.from(placeLink.parentElement?.children ?? []);
    expect(children.indexOf(placeLink)).toBeLessThan(children.indexOf(addButton));
  });

  it("opens the add-item dialog pre-filled with this box", async () => {
    const user = userEvent.setup();
    mockLoaded();

    renderWithClient(<BoxDetailPage />);

    await waitFor(() => expect(screen.getByText("Summerhouse")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Add item/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Box")).toHaveValue("10");
  });

  it("lists the box's contents", async () => {
    mockLoaded();

    renderWithClient(<BoxDetailPage />);

    await waitFor(() => expect(screen.getByText("Christmas lights")).toBeInTheDocument());
  });
});
