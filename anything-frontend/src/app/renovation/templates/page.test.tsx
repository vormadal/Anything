import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import RenovationTemplatesPage from "./page";
import {
  useDeleteRenovationRoomTemplate,
  useRenovationMaterials,
  useRenovationRoomTemplates,
  useSaveRenovationRoomTemplate,
} from "@/hooks/useRenovation";
import { useHouseholdContext } from "@/context/HouseholdContext";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/renovation/templates",
  useParams: () => ({}),
}));

jest.mock("@/context/HouseholdContext", () => ({
  useHouseholdContext: jest.fn(),
}));

jest.mock("@/hooks/useRenovation", () => ({
  useRenovationRoomTemplates: jest.fn(),
  useRenovationMaterials: jest.fn(),
  useSaveRenovationRoomTemplate: jest.fn(),
  useDeleteRenovationRoomTemplate: jest.fn(),
}));

const mockTemplates = useRenovationRoomTemplates as jest.Mock;
const mockMaterials = useRenovationMaterials as jest.Mock;
const mockSaveHook = useSaveRenovationRoomTemplate as jest.Mock;
const mockDeleteHook = useDeleteRenovationRoomTemplate as jest.Mock;
const mockHousehold = useHouseholdContext as jest.Mock;

function queryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isPaused: false,
    isFetching: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

const bathroom = {
  roomType: "bathroom",
  label: "Bathroom",
  isBuiltIn: true,
  isCustomised: false,
  length: 2.4,
  width: 1.8,
  height: 2.4,
  doors: 1,
  windows: 0,
  lines: [
    {
      key: "floor-tiles",
      label: "Floor tiles",
      group: "Surfaces",
      category: "Tiles",
      materialName: "Floor tiles 30×60",
      basis: "Floor",
      unit: "m²",
      defaultPrice: 495,
      wastePercent: 10,
      enabledByDefault: true,
    },
    {
      key: "toilet",
      label: "Toilet",
      group: "Fixtures",
      category: "Sanitary",
      materialName: "Wall-hung toilet",
      basis: "Fixed",
      unit: "pcs",
      defaultPrice: 4200,
      wastePercent: 0,
      fixedQuantity: 1,
      enabledByDefault: true,
    },
  ],
};

const office = {
  roomType: "office",
  label: "Office",
  isBuiltIn: false,
  isCustomised: false,
  length: 3,
  width: 3,
  height: 2.5,
  doors: 1,
  windows: 1,
  lines: [],
};

const customisedBathroom = { ...bathroom, isCustomised: true };

describe("RenovationTemplatesPage", () => {
  let save: jest.Mock;
  let remove: jest.Mock;

  function setup({
    role = "Owner",
    templates = [bathroom, office],
    query = {},
  }: { role?: string; templates?: unknown[]; query?: Record<string, unknown> } = {}) {
    mockHousehold.mockReturnValue({ currentHouseholdRole: role });
    mockTemplates.mockReturnValue(queryResult({ data: templates, ...query }));
    mockMaterials.mockReturnValue(queryResult({ data: [] }));
    mockSaveHook.mockReturnValue({ mutateAsync: save, isPending: false });
    mockDeleteHook.mockReturnValue({ mutateAsync: remove, isPending: false });
    return renderWithClient(<RenovationTemplatesPage />);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    save = jest.fn().mockResolvedValue({});
    remove = jest.fn().mockResolvedValue(undefined);
  });

  it("lists the room types and opens the first one in its editor", () => {
    setup();

    expect(screen.getByRole("button", { name: "Bathroom" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Office" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Length (m)")).toHaveValue("2.4");
    expect(screen.getByRole("button", { name: /Floor tiles/, expanded: false })).toBeInTheDocument();
    expect(screen.getByText("At default size")).toBeInTheDocument();
  });

  it("marks a customised built-in with a badge", () => {
    setup({ templates: [customisedBathroom, office] });

    expect(within(screen.getByRole("button", { name: /Bathroom/ })).getByText("Customised")).toBeInTheDocument();
  });

  it("lets a manager change a line's price and saves the whole template", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /Floor tiles/, expanded: false }));
    const price = screen.getByLabelText("Default price (kr)");
    await user.clear(price);
    await user.type(price, "550");
    await user.click(screen.getByRole("button", { name: "Save template" }));

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        roomType: "bathroom",
        label: "Bathroom",
        length: 2.4,
        width: 1.8,
        height: 2.4,
        doors: 1,
        windows: 0,
        lines: [
          expect.objectContaining({ key: "floor-tiles", defaultPrice: 550, wastePercent: 10, basis: "Floor" }),
          expect.objectContaining({ key: "toilet", defaultPrice: 4200, fixedQuantity: 1, basis: "Fixed" }),
        ],
      }),
    );
  });

  it("shows validation inline and does not save an invalid template", async () => {
    const user = userEvent.setup();
    setup();

    await user.clear(screen.getByLabelText("Length (m)"));
    await user.click(screen.getByRole("button", { name: "Save template" }));

    expect(await screen.findByText("Enter a number from 0 to 1000")).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it("shows a non-manager a read-only template with no edit controls", () => {
    setup({ role: "Member" });

    expect(screen.getByText("Only household owners and admins can change room templates.")).toBeInTheDocument();
    expect(screen.getByLabelText("Length (m)")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save template" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add line" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New room type" })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Floor tiles on by default" })).toBeDisabled();
  });

  it("resets a customised built-in only after confirmation", async () => {
    const user = userEvent.setup();
    setup({ templates: [customisedBathroom, office] });

    await user.click(screen.getByRole("button", { name: "Reset to default" }));
    const dialog = await screen.findByRole("dialog");
    expect(remove).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Reset" }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith("bathroom"));
  });

  it("deletes a household room type after confirmation", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Office" }));
    await user.click(screen.getByRole("button", { name: "Delete room type" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith("office"));
  });

  it("does not offer to reset or delete a built-in that is not customised", () => {
    setup();

    expect(screen.queryByRole("button", { name: "Reset to default" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete room type" })).not.toBeInTheDocument();
  });

  it("derives the key for a new room type and saves it from the editor", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "New room type" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "Home Gym");
    expect(within(dialog).getByText("Stored as “home-gym”")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("button", { name: /Home Gym/ })).toHaveAttribute("aria-pressed", "true");
    await user.type(screen.getByLabelText("Length (m)"), "3");
    await user.type(screen.getByLabelText("Width (m)"), "2");
    await user.type(screen.getByLabelText("Height (m)"), "2.5");
    await user.type(screen.getByLabelText("Doors"), "0");
    await user.type(screen.getByLabelText("Windows"), "0");
    await user.click(screen.getByRole("button", { name: "Create room type" }));

    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ roomType: "home-gym", label: "Home Gym", lines: [] })));
  });

  it("refuses a new room type whose key already exists", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "New room type" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "Bathroom");
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent("A room type with this name already exists");
    expect(save).not.toHaveBeenCalled();
  });

  it("shows a load error instead of the room types when the list fails", () => {
    setup({ templates: undefined, query: { data: undefined, isError: true } });

    expect(screen.getByText("Couldn't load room templates")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Room types" })).not.toBeInTheDocument();
  });
});
