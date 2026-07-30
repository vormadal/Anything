import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { PlaceFormDialog } from "./PlaceFormDialog";

const mockUnitsGet = jest.fn();
const mockUnitsPost = jest.fn();
const mockUnitPut = jest.fn();
const mockUnitById: jest.Mock = jest.fn(() => ({ put: mockUnitPut }));

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      inventoryStorageUnits: {
        get: (...args: unknown[]) => mockUnitsGet(...args),
        post: (...args: unknown[]) => mockUnitsPost(...args),
        byId: (...args: unknown[]) => mockUnitById(...args),
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

describe("PlaceFormDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnitsGet.mockResolvedValue([
      { id: 1, name: "Summerhouse", parentId: null },
      { id: 2, name: "Shed", parentId: 1 },
    ]);
  });

  it("creates a top-level place with no parent", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockUnitsPost.mockResolvedValue({ id: 3 });

    renderWithClient(<PlaceFormDialog onClose={onClose} />);

    await user.type(screen.getByLabelText(/Name/), "Basement storage room");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(mockUnitsPost).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Basement storage room", parentId: null })
      )
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("creates a place nested under a chosen parent", async () => {
    const user = userEvent.setup();
    mockUnitsPost.mockResolvedValue({ id: 3 });

    renderWithClient(<PlaceFormDialog onClose={jest.fn()} />);

    await user.type(screen.getByLabelText(/Name/), "Tool corner");
    await user.selectOptions(screen.getByLabelText("Parent place"), "1");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(mockUnitsPost).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Tool corner", parentId: 1 })
      )
    );
  });

  it("pre-selects the parent when creating from a place's detail page", async () => {
    await waitFor(() => {});
    renderWithClient(<PlaceFormDialog defaultParentId={1} onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByLabelText("Parent place")).toHaveValue("1"));
  });

  it("pre-fills the name and parent when editing", async () => {
    renderWithClient(
      <PlaceFormDialog
        place={{ id: 2, name: "Shed", parentId: 1 }}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByLabelText(/Name/)).toHaveValue("Shed");
    await waitFor(() => expect(screen.getByLabelText("Parent place")).toHaveValue("1"));
  });

  it("excludes the place itself from its own parent options, so it can't become its own ancestor", async () => {
    renderWithClient(
      <PlaceFormDialog
        place={{ id: 1, name: "Summerhouse", parentId: null }}
        onClose={jest.fn()}
      />
    );

    await waitFor(() => expect(mockUnitsGet).toHaveBeenCalled());
    const parentSelect = screen.getByLabelText("Parent place");
    // Summerhouse (itself) and Shed (its own child, would create a cycle) are both excluded.
    expect(parentSelect).not.toHaveTextContent("Summerhouse");
    expect(parentSelect).not.toHaveTextContent("Shed");
  });

  it("sends an explicit null parentId when clearing the parent on an existing place", async () => {
    const user = userEvent.setup();
    mockUnitPut.mockResolvedValue(undefined);

    renderWithClient(
      <PlaceFormDialog
        place={{ id: 2, name: "Shed", parentId: 1 }}
        onClose={jest.fn()}
      />
    );

    await waitFor(() => expect(screen.getByLabelText("Parent place")).toHaveValue("1"));
    await user.selectOptions(screen.getByLabelText("Parent place"), "");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockUnitPut).toHaveBeenCalledWith(expect.objectContaining({ parentId: null }))
    );
  });
});
