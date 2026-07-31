import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import PlaceDetailPage from "./page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/inventory/places/1",
  useParams: () => ({ id: "1" }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

const mockUnitsGet = jest.fn();
const mockUnitGet = jest.fn();
const mockUnitDelete = jest.fn();
const mockBoxesGet = jest.fn();
const mockItemsGet = jest.fn();
const mockAttachmentsGet = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      inventoryStorageUnits: {
        get: (...args: unknown[]) => mockUnitsGet(...args),
        byId: () => ({
          get: mockUnitGet,
          delete: mockUnitDelete,
          put: jest.fn(),
          attachments: {
            get: (...args: unknown[]) => mockAttachmentsGet(...args),
            post: jest.fn(),
            byAttachmentId: () => ({ delete: jest.fn(), download: { get: jest.fn() } }),
          },
        }),
      },
      inventoryBoxes: { get: (...args: unknown[]) => mockBoxesGet(...args) },
      inventoryItems: { get: (...args: unknown[]) => mockItemsGet(...args) },
    },
  },
}));

const place = { id: 1, name: "Summerhouse" };

function mockLoaded() {
  mockUnitGet.mockResolvedValue(place);
  mockUnitsGet.mockResolvedValue([place]);
  mockBoxesGet.mockResolvedValue([
    { id: 10, number: 4, storageUnitId: 1 },
    { id: 11, number: 7, storageUnitId: 2 },
  ]);
  mockItemsGet.mockResolvedValue([
    { id: 100, name: "Christmas lights", boxId: 10, storageUnitId: 1 },
    { id: 101, name: "Deck chair", description: "Folds flat", boxId: null, storageUnitId: 1 },
  ]);
  mockAttachmentsGet.mockResolvedValue([]);
}

describe("PlaceDetailPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists only the boxes in this place, with their item counts", async () => {
    mockLoaded();

    renderWithClient(<PlaceDetailPage />);

    await waitFor(() => expect(screen.getByText("Box 4")).toBeInTheDocument());
    expect(screen.getByText("1 item")).toBeInTheDocument();
    expect(screen.queryByText("Box 7")).not.toBeInTheDocument();
    expect(screen.getByText("Box 4").closest("a")).toHaveAttribute(
      "href",
      "/inventory/boxes/10"
    );
  });

  it("separates loose items from the boxed ones", async () => {
    mockLoaded();

    renderWithClient(<PlaceDetailPage />);

    await waitFor(() => expect(screen.getByText("Loose items")).toBeInTheDocument());
    expect(screen.getByText("Deck chair")).toBeInTheDocument();
    // The boxed item belongs under its box, not in the loose list.
    expect(screen.queryByText("Christmas lights")).not.toBeInTheDocument();
  });

  it("explains the refusal when the place still holds boxes or items", async () => {
    const user = userEvent.setup();
    mockLoaded();
    // The API answers 409 rather than orphaning the contents.
    mockUnitDelete.mockRejectedValue(new Error("Conflict"));

    renderWithClient(<PlaceDetailPage />);

    await waitFor(() => expect(screen.getByText("Box 4")).toBeInTheDocument());
    await user.click(screen.getByLabelText("More options"));
    await user.click(await screen.findByText("Delete place"));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Empty this place first — it still has boxes, items, or places in it."
      )
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("returns to the overview once the place is deleted", async () => {
    const user = userEvent.setup();
    mockLoaded();
    mockUnitDelete.mockResolvedValue(undefined);

    renderWithClient(<PlaceDetailPage />);

    await waitFor(() => expect(screen.getByText("Box 4")).toBeInTheDocument());
    await user.click(screen.getByLabelText("More options"));
    await user.click(await screen.findByText("Delete place"));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/inventory"));
  });

  it("shows the photo gallery and documents sections", async () => {
    mockLoaded();

    renderWithClient(<PlaceDetailPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Add photo/ })).toBeInTheDocument()
    );
    expect(screen.getByText("Documents")).toBeInTheDocument();
  });

  it("shows a link to the parent place when nested", async () => {
    const parent = { id: 2, name: "Basement storage room", parentId: null };
    const nestedPlace = { ...place, parentId: 2 };
    mockUnitGet.mockResolvedValue(nestedPlace);
    mockUnitsGet.mockResolvedValue([nestedPlace, parent]);
    mockBoxesGet.mockResolvedValue([]);
    mockItemsGet.mockResolvedValue([]);
    mockAttachmentsGet.mockResolvedValue([]);

    renderWithClient(<PlaceDetailPage />);

    const parentLink = await screen.findByRole("link", { name: /Basement storage room/ });
    expect(parentLink).toHaveAttribute("href", "/inventory/places/2");
  });

  it("lists nested child places and offers to add another", async () => {
    const user = userEvent.setup();
    const child = { id: 3, name: "Shed", parentId: 1 };
    mockUnitGet.mockResolvedValue(place);
    mockUnitsGet.mockResolvedValue([place, child]);
    mockBoxesGet.mockResolvedValue([]);
    mockItemsGet.mockResolvedValue([]);
    mockAttachmentsGet.mockResolvedValue([]);

    renderWithClient(<PlaceDetailPage />);

    const childLink = await screen.findByRole("link", { name: /Shed/ });
    expect(childLink).toHaveAttribute("href", "/inventory/places/3");

    await user.click(screen.getByRole("button", { name: "Add place" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("New place");
  });

  it("shows an error state when the place cannot be loaded", async () => {
    mockUnitGet.mockRejectedValue(new Error("boom"));
    mockUnitsGet.mockResolvedValue([]);
    mockBoxesGet.mockResolvedValue([]);
    mockItemsGet.mockResolvedValue([]);

    renderWithClient(<PlaceDetailPage />);

    await waitFor(() =>
      expect(screen.getByText(/Failed to load this place/)).toBeInTheDocument()
    );
  });
});
