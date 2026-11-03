import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import RenovationShoppingPage from "./page";
import {
  useAddRenovationLineToInventory,
  useCreateRenovationPurchase,
  useDeleteRenovationPurchase,
  useRenovationMaterials,
  useRenovationProject,
  useRenovationPurchases,
} from "@/hooks/useRenovation";
import { useCreateVendor, useVendors } from "@/hooks/useVendors";
import type {
  RenovationMaterialResponse,
  RenovationProjectResponse,
  RenovationPurchaseResponse,
} from "@/lib/api-client/models/index";
import { toast } from "sonner";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/useRenovation", () => ({
  useRenovationProject: jest.fn(),
  useRenovationPurchases: jest.fn(),
  useRenovationMaterials: jest.fn(),
  useCreateRenovationPurchase: jest.fn(),
  useDeleteRenovationPurchase: jest.fn(),
  useAddRenovationLineToInventory: jest.fn(),
  useRenovationPurchaseAttachments: jest.fn(() => ({ data: [], isLoading: false, isError: false, isPaused: false, isFetching: false, refetch: jest.fn() })),
  useUploadRenovationPurchaseAttachment: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useDownloadRenovationPurchaseAttachment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteRenovationPurchaseAttachment: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/useVendors", () => ({
  useVendors: jest.fn(),
  useCreateVendor: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

let mockSearch = "";
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "7" }),
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  usePathname: () => "/renovation/7/shopping",
}));

const project = {
  id: 7,
  name: "Kitchen",
  rooms: [
    {
      id: 1,
      name: "Bedroom",
      lines: [
        { id: 11, roomId: 1, label: "Flooring", group: "Surfaces", basis: "Floor", materialId: 5, description: "Oak laminate 8 mm", unit: "m²", unitPrice: 289, remainingQuantity: 12.67 },
      ],
    },
    {
      id: 2,
      name: "Hallway",
      lines: [
        { id: 21, roomId: 2, label: "Flooring", group: "Surfaces", basis: "Floor", materialId: 5, description: "Oak laminate 8 mm", unit: "m²", unitPrice: 289, remainingQuantity: 5.28 },
      ],
    },
    {
      id: 3,
      name: "Bathroom",
      lines: [
        { id: 31, roomId: 3, label: "Plumber", group: "Labour", basis: "Fixed", materialId: null, description: "Plumber", unit: "job", unitPrice: 18000, remainingQuantity: 1 },
      ],
    },
  ],
} as unknown as RenovationProjectResponse;

const materials = [
  { id: 5, name: "Oak laminate 8 mm", unit: "m²", defaultPrice: 289, packSize: 2.13 },
] as unknown as RenovationMaterialResponse[];

const purchases = [
  {
    id: 100,
    vendor: "Byggemarked",
    purchasedOn: { year: 2026, month: 10, day: 30 },
    totalAmount: 6380,
    lines: [
      { lineId: 11, roomName: "Bedroom", lineLabel: "Flooring", unit: "m²", quantity: 12.67, amount: 3662, inventoryItemId: null },
      { lineId: 21, roomName: "Hallway", lineLabel: "Flooring", unit: "m²", quantity: 5.28, amount: 1526, inventoryItemId: 555 },
    ],
  },
] as unknown as RenovationPurchaseResponse[];

const vendors = [{ id: 3, name: "Byggemarked", createdOn: "2026-01-01T00:00:00Z" }];

function query<T>(data: T | undefined, overrides: Record<string, unknown> = {}) {
  return {
    data,
    isLoading: false,
    isError: false,
    isPaused: false,
    isFetching: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

function mutation(resolved: unknown = {}) {
  return { mutateAsync: jest.fn().mockResolvedValue(resolved), isPending: false };
}

let createMock: ReturnType<typeof mutation>;
let addMock: ReturnType<typeof mutation>;
let createVendorMock: ReturnType<typeof mutation>;

function laminateCheckbox(): HTMLElement {
  return screen.getByRole("checkbox", { name: /Oak laminate 8 mm/ });
}

function laminateRow(): HTMLElement {
  const row = laminateCheckbox().closest("label");
  if (!row) throw new Error("Laminate checkbox is not inside its row label");
  return row;
}

function openDialog(): HTMLElement {
  return screen.getByRole("dialog");
}

describe("RenovationShoppingPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = "";
    createMock = mutation();
    addMock = mutation({ id: 555 });
    createVendorMock = mutation({ id: 9, name: "Gulvhuset", createdOn: "2026-02-01T00:00:00Z" });
    (useCreateVendor as jest.Mock).mockReturnValue(createVendorMock);
    (useRenovationProject as jest.Mock).mockReturnValue(query(project));
    (useRenovationPurchases as jest.Mock).mockReturnValue(query(purchases));
    (useRenovationMaterials as jest.Mock).mockReturnValue(query(materials));
    (useVendors as jest.Mock).mockReturnValue(query(vendors));
    (useCreateRenovationPurchase as jest.Mock).mockReturnValue(createMock);
    (useDeleteRenovationPurchase as jest.Mock).mockReturnValue(mutation());
    (useAddRenovationLineToInventory as jest.Mock).mockReturnValue(addMock);
  });

  it("merges the same material across rooms into one group with a per-room breakdown", () => {
    renderWithClient(<RenovationShoppingPage />);

    const materialsSection = screen.getByRole("region", { name: "Materials" });
    expect(within(materialsSection).getAllByRole("checkbox")).toHaveLength(1);
    expect(laminateRow()).toHaveTextContent("Bedroom 12,7 m² · Hallway 5,3 m²");
    expect(laminateRow()).toHaveTextContent("Packs of 2,13 m² → 9 packs");

    const services = screen.getByRole("region", { name: "Services" });
    expect(within(services).getByRole("checkbox", { name: /Plumber/ })).toBeInTheDocument();
  });

  it("preselects the group of the line in the ?line= deep link", () => {
    mockSearch = "line=21";
    renderWithClient(<RenovationShoppingPage />);

    expect(laminateCheckbox()).toBeChecked();
    expect(screen.getByText("1 material · 2 lines in 2 rooms")).toBeInTheDocument();
  });

  it("shows the selection bar only while something is selected", () => {
    renderWithClient(<RenovationShoppingPage />);
    expect(screen.queryByRole("button", { name: "Record purchase" })).not.toBeInTheDocument();

    fireEvent.click(laminateCheckbox());
    expect(screen.getByRole("button", { name: "Record purchase" })).toBeInTheDocument();
  });

  it("lowering a quantity changes the split preview and sends that quantity", async () => {
    mockSearch = "line=21";
    renderWithClient(<RenovationShoppingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Record purchase" }));

    const dialog = openDialog();
    fireEvent.change(within(dialog).getByLabelText(/Total paid/), { target: { value: "6380" } });
    // At the full 12.67 m² and 5.28 m² the 6380 splits roughly 4.503 / 1.877.
    expect(within(dialog).getByText("4.503 kr.")).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Quantity bought for Flooring in Bedroom"), {
      target: { value: "6" },
    });
    // Lowering Bedroom to 6 m²: weights 1734 and 1525.92, so Bedroom takes about 3.394 kr.
    expect(within(dialog).getByText("3.394 kr.")).toBeInTheDocument();
    expect(within(dialog).getByText(/Partial · 6,7 m² still to buy/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /Save purchase/ }));
    await waitFor(() =>
      expect(createMock.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAmount: 6380,
          lines: [
            expect.objectContaining({ lineId: 11, quantity: 6 }),
            expect.objectContaining({ lineId: 21, quantity: 5.28 }),
          ],
        }),
      ),
    );
  });

  it("sends the chosen vendor id and closes the dialog after saving", async () => {
    mockSearch = "line=21";
    renderWithClient(<RenovationShoppingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Record purchase" }));

    const dialog = openDialog();
    fireEvent.change(within(dialog).getByLabelText("Vendor"), { target: { value: "3" } });
    fireEvent.change(within(dialog).getByLabelText(/Total paid/), { target: { value: "6380" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Save purchase/ }));

    await waitFor(() =>
      expect(createMock.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ vendorId: 3, totalAmount: 6380 }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("creates a vendor from the picker and saves the purchase against it", async () => {
    mockSearch = "line=21";
    const user = userEvent.setup();
    renderWithClient(<RenovationShoppingPage />);
    await user.click(screen.getByRole("button", { name: "Record purchase" }));

    await user.selectOptions(within(openDialog()).getByLabelText("Vendor"), "new");
    const newVendor = screen.getByRole("dialog", { name: "New vendor" });
    await user.type(within(newVendor).getAllByRole("textbox")[0], "Gulvhuset");
    await user.click(within(newVendor).getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(createVendorMock.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ name: "Gulvhuset" })),
    );
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "New vendor" })).not.toBeInTheDocument());

    // The purchase dialog must still be interactive after the nested dialog closed; user-event
    // checks pointer-events, so a stuck body pointer-events value fails here.
    const dialog = openDialog();
    expect(within(dialog).getByLabelText("Vendor")).toHaveValue("9");
    await user.type(within(dialog).getByLabelText(/Total paid/), "6380");
    await user.click(within(dialog).getByRole("button", { name: /Save purchase/ }));

    await waitFor(() =>
      expect(createMock.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ vendorId: 9, totalAmount: 6380 }),
      ),
    );
  });

  it("keeps the previous vendor choice when creating a vendor is cancelled", async () => {
    mockSearch = "line=21";
    const user = userEvent.setup();
    renderWithClient(<RenovationShoppingPage />);
    await user.click(screen.getByRole("button", { name: "Record purchase" }));

    await user.selectOptions(within(openDialog()).getByLabelText("Vendor"), "3");
    await user.selectOptions(within(openDialog()).getByLabelText("Vendor"), "new");
    const newVendor = screen.getByRole("dialog", { name: "New vendor" });
    await user.click(within(newVendor).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "New vendor" })).not.toBeInTheDocument());
    expect(within(openDialog()).getByLabelText("Vendor")).toHaveValue("3");
    expect(createVendorMock.mutateAsync).not.toHaveBeenCalled();
  });

  it("leaves a line at 0 out of the purchase and gives it no share of the total", async () => {
    mockSearch = "line=21";
    renderWithClient(<RenovationShoppingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Record purchase" }));

    const dialog = openDialog();
    fireEvent.change(within(dialog).getByLabelText(/Total paid/), { target: { value: "6380" } });
    fireEvent.change(within(dialog).getByLabelText("Quantity bought for Flooring in Bedroom"), {
      target: { value: "0" },
    });
    expect(within(dialog).getByText("Not bought · stays on the list")).toBeInTheDocument();
    expect(within(dialog).getAllByLabelText("Done even if less")).toHaveLength(1);

    fireEvent.click(within(dialog).getByRole("button", { name: /Save purchase/ }));
    await waitFor(() =>
      expect(createMock.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ lines: [expect.objectContaining({ lineId: 21, quantity: 5.28 })] }),
      ),
    );
  });

  it("refuses to save when every line is at 0", () => {
    mockSearch = "line=21";
    renderWithClient(<RenovationShoppingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Record purchase" }));

    const dialog = openDialog();
    fireEvent.change(within(dialog).getByLabelText(/Total paid/), { target: { value: "6380" } });
    fireEvent.change(within(dialog).getByLabelText("Total bought of Oak laminate 8 mm"), {
      target: { value: "0" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /Save purchase/ }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent("at least one line");
    expect(createMock.mutateAsync).not.toHaveBeenCalled();
  });

  it("splits a material's total bought across rooms by what each still needs", async () => {
    mockSearch = "line=21";
    renderWithClient(<RenovationShoppingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Record purchase" }));

    const dialog = openDialog();
    const groupTotal = within(dialog).getByLabelText("Total bought of Oak laminate 8 mm");
    // Defaults to the sum of what's still needed: 12.67 + 5.28.
    expect(groupTotal).toHaveValue("17.95");

    fireEvent.change(groupTotal, { target: { value: "10" } });
    // 10 × 12.67 / 17.95 = 7.06; the last line takes the remainder.
    expect(within(dialog).getByLabelText("Quantity bought for Flooring in Bedroom")).toHaveValue("7.06");
    expect(within(dialog).getByLabelText("Quantity bought for Flooring in Hallway")).toHaveValue("2.94");

    // Editing a line by hand makes the total follow the lines again.
    fireEvent.change(within(dialog).getByLabelText("Quantity bought for Flooring in Hallway"), {
      target: { value: "3" },
    });
    expect(groupTotal).toHaveValue("10.06");

    fireEvent.change(within(dialog).getByLabelText(/Total paid/), { target: { value: "2900" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Save purchase/ }));
    await waitFor(() =>
      expect(createMock.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: [
            expect.objectContaining({ lineId: 11, quantity: 7.06 }),
            expect.objectContaining({ lineId: 21, quantity: 3 }),
          ],
        }),
      ),
    );
  });

  it("adds a purchased line to the inventory and offers a link to the item", async () => {
    renderWithClient(<RenovationShoppingPage />);
    fireEvent.click(screen.getByRole("button", { name: /Byggemarked/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add to inventory" }));

    const dialog = openDialog();
    fireEvent.change(within(dialog).getByLabelText("Brand"), { target: { value: "Kronospan" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add to inventory" }));

    await waitFor(() =>
      expect(addMock.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ purchaseId: 100, lineId: 11, brand: "Kronospan" }),
      ),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Added to inventory",
        expect.objectContaining({ action: expect.objectContaining({ label: "View item" }) }),
      ),
    );
  });

  it("links to the inventory item for a line that is already there", () => {
    renderWithClient(<RenovationShoppingPage />);
    fireEvent.click(screen.getByRole("button", { name: /Byggemarked/ }));

    expect(screen.getByRole("link", { name: "In inventory" })).toHaveAttribute("href", "/inventory/items/555");
  });

  it("shows the load error instead of an empty list when the project fails to load", () => {
    (useRenovationProject as jest.Mock).mockReturnValue(query(undefined, { isError: true }));
    renderWithClient(<RenovationShoppingPage />);

    expect(screen.getByText("Couldn't load this shopping list")).toBeInTheDocument();
    expect(screen.queryByText(/Nothing left to buy/)).not.toBeInTheDocument();
  });

  it("shows the purchases load error when the purchases fail", () => {
    (useRenovationPurchases as jest.Mock).mockReturnValue(query(undefined, { isError: true }));
    renderWithClient(<RenovationShoppingPage />);

    expect(screen.getByText("Couldn't load purchases")).toBeInTheDocument();
    expect(screen.queryByText("No purchases recorded yet.")).not.toBeInTheDocument();
  });

  it("shows the empty purchases state when none are recorded", () => {
    (useRenovationPurchases as jest.Mock).mockReturnValue(query([]));
    renderWithClient(<RenovationShoppingPage />);

    expect(screen.getByText("No purchases recorded yet.")).toBeInTheDocument();
  });
});
