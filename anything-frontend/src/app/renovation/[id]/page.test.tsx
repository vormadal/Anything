import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import RenovationProjectPage from "./page";
import {
  useDeleteRenovationProject,
  useRenovationProject,
  useUpdateRenovationProject,
} from "@/hooks/useRenovation";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/renovation/3",
  useParams: () => ({ id: "3" }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

jest.mock("@/hooks/useRenovation", () => ({
  useRenovationProject: jest.fn(),
  useUpdateRenovationProject: jest.fn(),
  useDeleteRenovationProject: jest.fn(),
}));

const mockUseProject = useRenovationProject as jest.Mock;
const mockUseUpdate = useUpdateRenovationProject as jest.Mock;
const mockUseDelete = useDeleteRenovationProject as jest.Mock;

function queryResult(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    isPaused: false,
    isFetching: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

// Kitchen: line 1 half bought (+100 vs its share), line 2 fully bought (-50), line 3 untouched.
// Hallway: nothing bought yet.
function buildProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 3,
    name: "Ground floor refresh",
    budget: 200000,
    forecast: 187352,
    estimate: 184759,
    actual: 1050,
    notes: "keep these",
    rooms: [
      {
        id: 11,
        name: "Kitchen",
        length: 4.2,
        width: 3.0,
        height: 2.5,
        floorArea: 12.6,
        forecast: 104677,
        actual: 1050,
        estimate: 1000,
        lines: [
          {
            id: 1,
            estimate: 1000,
            requiredQuantity: 10,
            purchasedQuantity: 5,
            actual: 600,
            remainingQuantity: 5,
            status: "Partial",
          },
          {
            id: 2,
            estimate: 500,
            requiredQuantity: 5,
            purchasedQuantity: 5,
            actual: 450,
            remainingQuantity: 0,
            status: "Complete",
          },
          {
            id: 3,
            estimate: 800,
            requiredQuantity: 8,
            purchasedQuantity: 0,
            actual: 0,
            remainingQuantity: 8,
            status: "NotStarted",
          },
        ],
      },
      {
        id: 12,
        name: "Hallway",
        length: 4,
        width: 1.2,
        height: 2.4,
        floorArea: 4.8,
        forecast: 3367,
        actual: 0,
        estimate: 3367,
        lines: [
          {
            id: 4,
            estimate: 3367,
            requiredQuantity: 4.8,
            purchasedQuantity: 0,
            actual: 0,
            remainingQuantity: 4.8,
            status: "NotStarted",
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("RenovationProjectPage", () => {
  let mutateUpdate: jest.Mock;
  let mutateDelete: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mutateUpdate = jest.fn();
    mutateDelete = jest.fn();
    mockUseUpdate.mockReturnValue({ mutateAsync: mutateUpdate, isPending: false });
    mockUseDelete.mockReturnValue({ mutateAsync: mutateDelete, isPending: false });
  });

  it("shows a loading state while the project loads", () => {
    mockUseProject.mockReturnValue(queryResult({ isLoading: true }));

    renderWithClient(<RenovationProjectPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows the budget headline, on-track status and headroom", () => {
    mockUseProject.mockReturnValue(queryResult({ data: buildProject() }));

    renderWithClient(<RenovationProjectPage />);

    expect(screen.getByText("On track")).toBeInTheDocument();
    expect(screen.getByText("187.352 kr.")).toBeInTheDocument();
    expect(screen.getByText("of 200.000 kr. budget · 12.648 kr. headroom")).toBeInTheDocument();
    expect(screen.getByText("3 lines to buy")).toBeInTheDocument();
    expect(screen.getByText("+50 kr. (5,0%)")).toBeInTheDocument();
    expect(screen.getByText("2 rooms · 17,4 m² floor")).toBeInTheDocument();
  });

  it("links to the shopping list and to each room", () => {
    mockUseProject.mockReturnValue(queryResult({ data: buildProject() }));

    renderWithClient(<RenovationProjectPage />);

    expect(screen.getByRole("link", { name: /Shopping list/ })).toHaveAttribute(
      "href",
      "/renovation/3/shopping",
    );
    expect(screen.getByRole("link", { name: "Add room" })).toHaveAttribute(
      "href",
      "/renovation/3/rooms/new",
    );
    const kitchen = screen.getByRole("link", { name: /Kitchen/ });
    expect(kitchen).toHaveAttribute("href", "/renovation/3/rooms/11");
    expect(within(kitchen).getByText("4,2 × 3,0 m · 12,6 m² · 1 of 3 bought")).toBeInTheDocument();
    expect(within(kitchen).getByText("+50 kr. vs est.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hallway/ })).toHaveAttribute("href", "/renovation/3/rooms/12");
  });

  it("marks rooms with no purchases as estimate only and not started", () => {
    mockUseProject.mockReturnValue(queryResult({ data: buildProject() }));

    renderWithClient(<RenovationProjectPage />);

    const hallway = screen.getByRole("link", { name: /Hallway/ });
    expect(within(hallway).getByText(/estimate only/)).toBeInTheDocument();
    expect(within(hallway).getByText("Not started")).toBeInTheDocument();
  });

  it("shows over budget when the forecast exceeds the budget", () => {
    mockUseProject.mockReturnValue(
      queryResult({ data: buildProject({ forecast: 210000 }) }),
    );

    renderWithClient(<RenovationProjectPage />);

    expect(screen.getByText("Over budget")).toBeInTheDocument();
    expect(screen.getByText("of 200.000 kr. budget · 10.000 kr. over")).toBeInTheDocument();
  });

  it("hides the status and offers to set a budget when none is set", async () => {
    const user = userEvent.setup();
    mockUseProject.mockReturnValue(queryResult({ data: buildProject({ budget: null }) }));

    renderWithClient(<RenovationProjectPage />);

    expect(screen.queryByText("On track")).not.toBeInTheDocument();
    expect(screen.queryByText(/headroom/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Set a budget" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Edit project");
  });

  it("shows a not-found message for a 404", () => {
    mockUseProject.mockReturnValue(
      queryResult({ isError: true, error: { responseStatusCode: 404 } }),
    );

    renderWithClient(<RenovationProjectPage />);

    expect(screen.getByText("Project not found.")).toBeInTheDocument();
    expect(screen.queryByText(/Couldn't load/)).not.toBeInTheDocument();
  });

  it("shows a load error, not not-found, when the request failed", () => {
    mockUseProject.mockReturnValue(
      queryResult({ isError: true, error: { responseStatusCode: 500 } }),
    );

    renderWithClient(<RenovationProjectPage />);

    expect(screen.getByText("Couldn't load this project")).toBeInTheDocument();
    expect(screen.queryByText("Project not found.")).not.toBeInTheDocument();
  });

  it("saves edits and keeps the existing notes", async () => {
    const user = userEvent.setup();
    mockUseProject.mockReturnValue(queryResult({ data: buildProject() }));
    mutateUpdate.mockResolvedValue(undefined);

    renderWithClient(<RenovationProjectPage />);

    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(await screen.findByText("Edit"));
    const dialog = await screen.findByRole("dialog");
    const budget = within(dialog).getByLabelText(/Budget \(kr/);
    await user.clear(budget);
    await user.type(budget, "250000");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mutateUpdate).toHaveBeenCalledWith({
        id: 3,
        name: "Ground floor refresh",
        budget: 250000,
        notes: "keep these",
      }),
    );
  });

  it("deletes the project after confirmation and returns to the list", async () => {
    const user = userEvent.setup();
    mockUseProject.mockReturnValue(queryResult({ data: buildProject() }));
    mutateDelete.mockResolvedValue(undefined);

    renderWithClient(<RenovationProjectPage />);

    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(await screen.findByText("Delete project"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(mutateDelete).toHaveBeenCalledWith(3));
    expect(toast.success).toHaveBeenCalledWith("Project deleted");
    expect(mockPush).toHaveBeenCalledWith("/renovation");
  });

  it("reports a failed delete and stays on the page", async () => {
    const user = userEvent.setup();
    mockUseProject.mockReturnValue(queryResult({ data: buildProject() }));
    mutateDelete.mockRejectedValue(new Error("boom"));

    renderWithClient(<RenovationProjectPage />);

    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(await screen.findByText("Delete project"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't delete the project"));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
