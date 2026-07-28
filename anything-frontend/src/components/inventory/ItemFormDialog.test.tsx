import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { ItemFormDialog } from "./ItemFormDialog";

const mockUnitsGet = jest.fn();
const mockBoxesGet = jest.fn();
const mockItemsPost = jest.fn();
const mockItemPut = jest.fn();
const mockItemById: jest.Mock = jest.fn(() => ({ put: mockItemPut }));

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      inventoryStorageUnits: { get: (...args: unknown[]) => mockUnitsGet(...args) },
      inventoryBoxes: { get: (...args: unknown[]) => mockBoxesGet(...args) },
      inventoryItems: {
        post: (...args: unknown[]) => mockItemsPost(...args),
        byId: (...args: unknown[]) => mockItemById(...args),
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
  usePathname: () => "/inventory",
  useParams: () => ({}),
}));

const places = [
  { id: 1, name: "Summerhouse" },
  { id: 2, name: "Basement storage room" },
];
const boxes = [
  { id: 10, number: 4, storageUnitId: 1 },
  { id: 11, number: 7, storageUnitId: 2 },
];

describe("ItemFormDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnitsGet.mockResolvedValue(places);
    mockBoxesGet.mockResolvedValue(boxes);
  });

  it("only offers the boxes that are in the selected place", async () => {
    const user = userEvent.setup();
    renderWithClient(<ItemFormDialog onClose={jest.fn()} />);

    // Both boxes are offered while no place narrows the choice.
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Box 4" })).toBeInTheDocument()
    );
    expect(screen.getByRole("option", { name: "Box 7" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Place"), "1");

    expect(screen.getByRole("option", { name: "Box 4" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Box 7" })).not.toBeInTheDocument();
  });

  it("clears a box that contradicts a newly chosen place", async () => {
    const user = userEvent.setup();
    renderWithClient(<ItemFormDialog onClose={jest.fn()} />);

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Box 4" })).toBeInTheDocument()
    );
    await user.selectOptions(screen.getByLabelText("Box"), "10");
    expect(screen.getByLabelText("Box")).toHaveValue("10");

    await user.selectOptions(screen.getByLabelText("Place"), "2");

    expect(screen.getByLabelText("Box")).toHaveValue("");
  });

  it("derives the place from the chosen box when creating", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockItemsPost.mockResolvedValue({ id: 100 });

    renderWithClient(<ItemFormDialog onClose={onClose} />);

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Box 4" })).toBeInTheDocument()
    );
    await user.type(screen.getByLabelText(/Name/), "Christmas lights");
    await user.selectOptions(screen.getByLabelText("Box"), "10");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(mockItemsPost).toHaveBeenCalledWith({
        name: "Christmas lights",
        description: null,
        boxId: 10,
        storageUnitId: 1,
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("repairs an item whose box and place disagree when it is saved", async () => {
    const user = userEvent.setup();
    mockItemPut.mockResolvedValue(undefined);

    renderWithClient(
      <ItemFormDialog
        item={{ id: 100, name: "Christmas lights", boxId: 10, storageUnitId: 2 }}
        onClose={jest.fn()}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Box 4" })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockItemPut).toHaveBeenCalledWith({
        name: "Christmas lights",
        description: null,
        boxId: 10,
        // Was 2 on the item; the box says the summerhouse, and the box wins.
        storageUnitId: 1,
      })
    );
  });
});
