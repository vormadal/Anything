import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import RenovationMaterialsPage from "./page";
import {
  useCreateRenovationMaterial,
  useDeleteRenovationMaterial,
  useRenovationMaterials,
  useUpdateRenovationMaterial,
} from "@/hooks/useRenovation";
import type { RenovationMaterialResponse } from "@/lib/api-client/models/index";
import { toast } from "sonner";

jest.mock("@/hooks/useRenovation", () => ({
  useRenovationMaterials: jest.fn(),
  useCreateRenovationMaterial: jest.fn(),
  useUpdateRenovationMaterial: jest.fn(),
  useDeleteRenovationMaterial: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

const mockRouterBack = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: mockRouterBack }),
  usePathname: () => "/renovation/materials",
}));

const materials = [
  {
    id: 1,
    name: "Oak laminate 8 mm",
    category: "Flooring",
    unit: "m²",
    defaultPrice: 289,
    wastePercent: 10,
    packSize: 2.13,
    productUrl: "https://store.example/oak-laminate",
  },
  {
    id: 2,
    name: "Floor tiles 30×60",
    category: "Tiles",
    unit: "m²",
    defaultPrice: 495,
    wastePercent: 10,
    productUrl: null,
  },
  {
    id: 3,
    name: "Mystery filler",
    category: null,
    unit: "tube",
    defaultPrice: 45,
    wastePercent: 0,
    productUrl: "javascript:alert(1)",
  },
] as unknown as RenovationMaterialResponse[];

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

function mutation() {
  return { mutateAsync: jest.fn().mockResolvedValue({}), isPending: false };
}

const createMock = mutation();
const updateMock = mutation();
const deleteMock = mutation();

function rowFor(name: string): HTMLElement {
  const row = screen.getByText(name).closest("button");
  if (!row) throw new Error(`No row for ${name}`);
  return row;
}

describe("RenovationMaterialsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRenovationMaterials as jest.Mock).mockReturnValue(query(materials));
    (useCreateRenovationMaterial as jest.Mock).mockReturnValue(createMock);
    (useUpdateRenovationMaterial as jest.Mock).mockReturnValue(updateMock);
    (useDeleteRenovationMaterial as jest.Mock).mockReturnValue(deleteMock);
  });

  it("shows a loading message before the materials arrive", () => {
    (useRenovationMaterials as jest.Mock).mockReturnValue(query(undefined, { isLoading: true }));
    renderWithClient(<RenovationMaterialsPage />);
    expect(screen.getByText("Loading materials…")).toBeInTheDocument();
  });

  it("lists materials with categories derived from the data and link status", () => {
    renderWithClient(<RenovationMaterialsPage />);

    const filter = screen.getByRole("group", { name: "Filter by category" });
    expect(within(filter).getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(within(filter).getByRole("button", { name: "Flooring" })).toBeInTheDocument();
    expect(within(filter).getByRole("button", { name: "Tiles" })).toBeInTheDocument();
    expect(within(filter).getByRole("button", { name: "Uncategorised" })).toBeInTheDocument();

    expect(rowFor("Oak laminate 8 mm")).toHaveTextContent("Flooring · +10% waste");
    expect(rowFor("Oak laminate 8 mm")).toHaveTextContent("289 kr/m²");
    expect(rowFor("Oak laminate 8 mm")).toHaveTextContent("Product linked");
    expect(rowFor("Floor tiles 30×60")).toHaveTextContent("No link");
  });

  it("filters by category chip", () => {
    renderWithClient(<RenovationMaterialsPage />);
    const filter = screen.getByRole("group", { name: "Filter by category" });
    fireEvent.click(within(filter).getByRole("button", { name: "Tiles" }));

    expect(screen.getByText("Floor tiles 30×60")).toBeInTheDocument();
    expect(screen.queryByText("Oak laminate 8 mm")).not.toBeInTheDocument();
  });

  it("filters by search text", () => {
    renderWithClient(<RenovationMaterialsPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "laminate" } });

    expect(screen.getByText("Oak laminate 8 mm")).toBeInTheDocument();
    expect(screen.queryByText("Floor tiles 30×60")).not.toBeInTheDocument();
  });

  it("saves an edited default price through the update mutation", async () => {
    renderWithClient(<RenovationMaterialsPage />);
    fireEvent.click(rowFor("Oak laminate 8 mm"));

    const form = screen.getByRole("form", { name: "Edit material" });
    fireEvent.change(within(form).getByLabelText("Default price (kr)"), { target: { value: "300" } });
    fireEvent.click(within(form).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(updateMock.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, name: "Oak laminate 8 mm", defaultPrice: 300, packSize: 2.13 }),
      ),
    );
  });

  it("confirms before deleting and calls the delete mutation", async () => {
    renderWithClient(<RenovationMaterialsPage />);
    fireEvent.click(rowFor("Floor tiles 30×60"));
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));

    const dialog = await screen.findByRole("dialog");
    expect(deleteMock.mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteMock.mutateAsync).toHaveBeenCalledWith(2));
  });

  it("creates a new material from the header action", async () => {
    renderWithClient(<RenovationMaterialsPage />);
    fireEvent.click(within(screen.getByTestId("header-actions")).getByRole("button", { name: "Add material" }));

    const form = screen.getByRole("form", { name: "New material" });
    fireEvent.change(within(form).getByLabelText("Name"), { target: { value: "Ceiling paint" } });
    fireEvent.click(within(form).getByRole("button", { name: "Add material" }));

    await waitFor(() =>
      expect(createMock.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ name: "Ceiling paint" })),
    );
  });

  it("shows an inline error and does not save when the name is only spaces", () => {
    renderWithClient(<RenovationMaterialsPage />);
    fireEvent.click(within(screen.getByTestId("header-actions")).getByRole("button", { name: "Add material" }));

    const form = screen.getByRole("form", { name: "New material" });
    // A blank string is stopped by the native `required`; spaces get past it and hit the inline check.
    fireEvent.change(within(form).getByLabelText("Name"), { target: { value: "   " } });
    fireEvent.click(within(form).getByRole("button", { name: "Add material" }));

    expect(within(form).getByRole("alert")).toHaveTextContent("Enter a name");
    expect(createMock.mutateAsync).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("renders a product link as an external anchor when it is http or https", () => {
    renderWithClient(<RenovationMaterialsPage />);
    fireEvent.click(rowFor("Oak laminate 8 mm"));

    const link = screen.getByRole("link", { name: /Open product page/ });
    expect(link).toHaveAttribute("href", "https://store.example/oak-laminate");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not render a non-http product link as a link", () => {
    renderWithClient(<RenovationMaterialsPage />);
    fireEvent.click(rowFor("Mystery filler"));

    expect(screen.queryByRole("link", { name: /Open product page/ })).not.toBeInTheDocument();
    expect(rowFor("Mystery filler")).toHaveTextContent("No link");
  });

  it("shows the no-re-pricing note", () => {
    renderWithClient(<RenovationMaterialsPage />);
    expect(screen.getByText(/Changing a default doesn.t re-price existing lines/)).toBeInTheDocument();
  });

  it("shows the load error instead of the empty state when the query fails", () => {
    (useRenovationMaterials as jest.Mock).mockReturnValue(query(undefined, { isError: true }));
    renderWithClient(<RenovationMaterialsPage />);

    expect(screen.getByText("Couldn't load materials")).toBeInTheDocument();
    expect(screen.queryByText(/No materials yet/)).not.toBeInTheDocument();
  });

  it("shows the empty state when the household has no materials", () => {
    (useRenovationMaterials as jest.Mock).mockReturnValue(query([]));
    renderWithClient(<RenovationMaterialsPage />);

    expect(screen.getByText(/No materials yet/)).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load materials")).not.toBeInTheDocument();
  });
});
