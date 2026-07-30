import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { BoxFormDialog } from "./BoxFormDialog";

const mockUnitsGet = jest.fn();
const mockBoxesGet = jest.fn();
const mockBoxesPost = jest.fn();
const mockBoxPut = jest.fn();
const mockBoxById: jest.Mock = jest.fn(() => ({ put: mockBoxPut }));

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      inventoryStorageUnits: { get: (...args: unknown[]) => mockUnitsGet(...args) },
      inventoryBoxes: {
        get: (...args: unknown[]) => mockBoxesGet(...args),
        post: (...args: unknown[]) => mockBoxesPost(...args),
        byId: (...args: unknown[]) => mockBoxById(...args),
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

describe("BoxFormDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnitsGet.mockResolvedValue([{ id: 1, name: "Summerhouse" }]);
    mockBoxesGet.mockResolvedValue([]);
  });

  it("creates a box with a label and description", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockBoxesPost.mockResolvedValue({ id: 10 });

    renderWithClient(<BoxFormDialog onClose={onClose} />);

    await user.type(screen.getByLabelText("Label"), "Christmas decorations");
    await user.type(screen.getByLabelText("Description"), "Lights and ornaments");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(mockBoxesPost).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "Christmas decorations",
          description: "Lights and ornaments",
        })
      )
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("pre-fills the label and description when editing", () => {
    renderWithClient(
      <BoxFormDialog
        box={{ id: 10, number: 4, storageUnitId: 1, label: "Tools", description: "Power tools" }}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByLabelText("Label")).toHaveValue("Tools");
    expect(screen.getByLabelText("Description")).toHaveValue("Power tools");
  });

  it("sends explicit nulls when label and description are left blank", async () => {
    const user = userEvent.setup();
    mockBoxPut.mockResolvedValue(undefined);

    renderWithClient(
      <BoxFormDialog box={{ id: 10, number: 4, storageUnitId: 1 }} onClose={jest.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockBoxPut).toHaveBeenCalledWith(
        expect.objectContaining({ label: null, description: null })
      )
    );
  });
});
