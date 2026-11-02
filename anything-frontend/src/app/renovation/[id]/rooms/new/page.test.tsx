import { screen, waitFor, fireEvent, within } from "@testing-library/react";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import {
  useCreateRenovationRoom,
  useRenovationMaterials,
  useRenovationRoomTemplates,
} from "@/hooks/useRenovation";
import NewRenovationRoomPage from "./page";

jest.mock("@/hooks/useRenovation", () => ({
  useRenovationRoomTemplates: jest.fn(),
  useRenovationMaterials: jest.fn(),
  useCreateRenovationRoom: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  usePathname: () => "/renovation/7/rooms/new",
  useParams: () => ({ id: "7" }),
}));

jest.mock("@/hooks/useSmartBack", () => ({
  useSmartBack: () => ({ navigateBack: jest.fn() }),
}));

const mockMutateAsync = jest.fn();

const TEMPLATES = [
  {
    roomType: "bedroom",
    isBuiltIn: true,
    isCustomised: false,
    label: "Bedroom",
    length: 3.6,
    width: 3.2,
    height: 2.5,
    doors: 1,
    windows: 1,
    lines: [
      { key: "floor", label: "Floor", group: "Surfaces", basis: "Floor", materialName: "Oak laminate", unit: "m²", defaultPrice: 289, wastePercent: 10, enabledByDefault: true },
      { key: "walls", label: "Walls", group: "Surfaces", basis: "Wall", materialName: "Wall paint", unit: "m²", defaultPrice: 48, wastePercent: 0, enabledByDefault: true },
      { key: "electrician", label: "Electrician", group: "Labour", basis: "Fixed", fixedQuantity: 1, unit: "job", defaultPrice: 6500, wastePercent: 0, enabledByDefault: false },
    ],
  },
  {
    roomType: "bathroom",
    isBuiltIn: true,
    isCustomised: false,
    label: "Bathroom",
    length: 2.4,
    width: 1.8,
    height: 2.4,
    doors: 1,
    windows: 0,
    lines: [
      { key: "floor", label: "Floor", group: "Surfaces", basis: "Floor", materialName: "Oak laminate", unit: "m²", defaultPrice: 289, wastePercent: 10, enabledByDefault: true },
    ],
  },
];

const MATERIALS = [{ id: 1, name: "Oak laminate", unit: "m²", defaultPrice: 300, wastePercent: 10 }];

function query<T>(data: T, overrides: Record<string, unknown> = {}) {
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

function renderPage() {
  return renderWithClient(<NewRenovationRoomPage />);
}

function pickType(label: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(label) }));
}

function continueStep() {
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

function goToScopeFor(label: string) {
  renderPage();
  pickType(label);
  continueStep();
  continueStep();
}

function totalText() {
  return screen.getByTestId("wizard-total").textContent;
}

describe("NewRenovationRoomPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRenovationRoomTemplates as jest.Mock).mockReturnValue(query(TEMPLATES));
    (useRenovationMaterials as jest.Mock).mockReturnValue(query(MATERIALS));
    (useCreateRenovationRoom as jest.Mock).mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
    mockMutateAsync.mockResolvedValue({ id: 42 });
  });

  it("shows a load error instead of the wizard when room types fail to load", () => {
    (useRenovationRoomTemplates as jest.Mock).mockReturnValue(
      query(undefined, { isError: true, isLoading: false }),
    );

    renderPage();

    expect(screen.getByText("Couldn't load room types and prices")).toBeInTheDocument();
    expect(screen.queryByText("What kind of room?")).not.toBeInTheDocument();
  });

  it("shows a load error when prices fail to load", () => {
    (useRenovationMaterials as jest.Mock).mockReturnValue(
      query(undefined, { isError: true, isLoading: false }),
    );

    renderPage();

    expect(screen.getByText("Couldn't load room types and prices")).toBeInTheDocument();
  });

  it("shows a loading placeholder while the templates load", () => {
    (useRenovationRoomTemplates as jest.Mock).mockReturnValue(
      query(undefined, { isLoading: true }),
    );

    renderPage();

    expect(screen.getByLabelText("Loading room types")).toBeInTheDocument();
    expect(screen.queryByText("What kind of room?")).not.toBeInTheDocument();
  });

  it("says so and blocks Continue when there are no room types", () => {
    (useRenovationRoomTemplates as jest.Mock).mockReturnValue(query([]));

    renderPage();

    expect(screen.getByText("No room types to choose from.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("renders a tile per room type with its typical size", () => {
    renderPage();

    expect(screen.getByRole("button", { name: /Bedroom/ })).toHaveTextContent("typ. 12 m²");
    expect(screen.getByRole("button", { name: /Bathroom/ })).toHaveTextContent("typ. 4 m²");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("picking a type names the room after it and resets the dimensions to its defaults", () => {
    renderPage();

    pickType("Bedroom");
    expect(screen.getByLabelText("Room name")).toHaveValue("Bedroom");
    continueStep();
    fireEvent.change(screen.getByLabelText("Length (m)"), { target: { value: "5" } });
    expect(screen.getByLabelText("Length (m)")).toHaveValue(5);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    pickType("Bathroom");
    expect(screen.getByLabelText("Room name")).toHaveValue("Bathroom");
    continueStep();
    expect(screen.getByLabelText("Length (m)")).toHaveValue(2.4);
    expect(screen.getByLabelText("Width (m)")).toHaveValue(1.8);
  });

  it("picking a type restores only the lines enabled by default", () => {
    goToScopeFor("Bedroom");

    expect(screen.getByRole("checkbox", { name: /Floor/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Walls/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Electrician/ })).not.toBeChecked();
  });

  it("changing a dimension updates the default-scope estimate", () => {
    renderPage();
    pickType("Bedroom");
    continueStep();

    expect(screen.getByText("Estimate with default scope")).toBeInTheDocument();
    expect(totalText()).toBe("5.270\u00a0kr.");

    fireEvent.change(screen.getByLabelText("Length (m)"), { target: { value: "5" } });

    expect(totalText()).toBe("7.085\u00a0kr.");
  });

  it("rejects a dimension that is not above 0 and blocks Continue", () => {
    renderPage();
    pickType("Bedroom");
    continueStep();

    fireEvent.change(screen.getByLabelText("Width (m)"), { target: { value: "0" } });

    expect(screen.getByText("Enter a number above 0")).toBeInTheDocument();
    expect(screen.getByLabelText("Width (m)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("steppers change the opening counts and never go below zero", () => {
    renderPage();
    pickType("Bathroom");
    continueStep();

    expect(screen.getByRole("button", { name: "Fewer windows" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "More windows" }));
    expect(screen.getByText("minus 1 door, 1 window")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fewer doors" }));
    expect(screen.getByText("minus 0 doors, 1 window")).toBeInTheDocument();
  });

  it("unticking a line lowers the room estimate", () => {
    goToScopeFor("Bedroom");

    expect(screen.getByText("Room estimate")).toBeInTheDocument();
    expect(totalText()).toBe("5.270\u00a0kr.");

    fireEvent.click(screen.getByRole("checkbox", { name: /Walls/ }));

    expect(totalText()).toBe("3.801\u00a0kr.");
  });

  it("ticking a line raises the estimate and shows the household's own price", () => {
    goToScopeFor("Bedroom");

    fireEvent.click(screen.getByRole("checkbox", { name: /Electrician/ }));

    expect(totalText()).toBe("11.770\u00a0kr.");
    expect(screen.getByText(/12,7 m² × 300\s*kr\./)).toBeInTheDocument();
  });

  it("submits the mutation with the checked line keys and opens the new room", async () => {
    goToScopeFor("Bedroom");
    fireEvent.click(screen.getByRole("checkbox", { name: /Electrician/ }));

    fireEvent.click(screen.getByRole("button", { name: "Add Bedroom to project" }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Bedroom",
          roomType: "bedroom",
          length: 3.6,
          doors: 1,
          windows: 1,
          lineKeys: ["floor", "walls", "electrician"],
        }),
      ),
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/renovation/7/rooms/42"));
  });

  it("sends only the lines still ticked", async () => {
    goToScopeFor("Bedroom");
    fireEvent.click(screen.getByRole("checkbox", { name: /Walls/ }));

    fireEvent.click(screen.getByRole("button", { name: "Add Bedroom to project" }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ lineKeys: ["floor"] })),
    );
  });

  it("shows the server error inline and stays on the form when the create fails", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("A room with this name already exists"));
    goToScopeFor("Bedroom");

    fireEvent.click(screen.getByRole("button", { name: "Add Bedroom to project" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/A room with this name already exists/)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("close link returns to the project", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "Close wizard" })).toHaveAttribute("href", "/renovation/7");
  });
});
