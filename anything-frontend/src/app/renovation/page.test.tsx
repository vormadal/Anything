import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import RenovationPage from "./page";
import {
  useCreateRenovationProject,
  useRenovationProjects,
} from "@/hooks/useRenovation";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/renovation",
  useParams: () => ({}),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

jest.mock("@/hooks/useRenovation", () => ({
  useRenovationProjects: jest.fn(),
  useCreateRenovationProject: jest.fn(),
}));

const mockUseProjects = useRenovationProjects as jest.Mock;
const mockUseCreate = useCreateRenovationProject as jest.Mock;

function queryResult(overrides: Record<string, unknown>) {
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

const projects = [
  { id: 1, name: "Ground floor refresh", forecast: 187352, budget: 200000, actual: 92395, roomCount: 4 },
  { id: 2, name: "Garden shed", forecast: 5000, budget: null, actual: 0, roomCount: 1 },
];

describe("RenovationPage", () => {
  let mutateAsync: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mutateAsync = jest.fn();
    mockUseCreate.mockReturnValue({ mutateAsync, isPending: false });
  });

  it("shows a loading state while projects load", () => {
    mockUseProjects.mockReturnValue(queryResult({ isLoading: true }));

    renderWithClient(<RenovationPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("No renovation projects yet")).not.toBeInTheDocument();
  });

  it("lists projects with forecast against budget and links to each overview", () => {
    mockUseProjects.mockReturnValue(queryResult({ data: projects }));

    renderWithClient(<RenovationPage />);

    expect(screen.getByText("Ground floor refresh")).toBeInTheDocument();
    expect(screen.getByText("187,352 kr")).toBeInTheDocument();
    expect(screen.getByText("of 200,000 kr budget")).toBeInTheDocument();
    expect(screen.getByText("4 rooms")).toBeInTheDocument();
    expect(screen.getByText("No budget set")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ground floor refresh/ })).toHaveAttribute(
      "href",
      "/renovation/1",
    );
    expect(screen.getByRole("link", { name: "Materials library" })).toHaveAttribute(
      "href",
      "/renovation/materials",
    );
  });

  it("shows the empty state only when the projects loaded and there are none", () => {
    mockUseProjects.mockReturnValue(queryResult({ data: [] }));

    renderWithClient(<RenovationPage />);

    expect(screen.getByText("No renovation projects yet")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load renovation projects")).not.toBeInTheDocument();
  });

  it("shows a load error, not the empty state, when the request failed", () => {
    mockUseProjects.mockReturnValue(queryResult({ isError: true }));

    renderWithClient(<RenovationPage />);

    expect(screen.getByText("Couldn't load renovation projects")).toBeInTheDocument();
    expect(screen.queryByText("No renovation projects yet")).not.toBeInTheDocument();
  });

  it("creates a project from the dialog and opens its overview", async () => {
    const user = userEvent.setup();
    mockUseProjects.mockReturnValue(queryResult({ data: projects }));
    mutateAsync.mockResolvedValue({ id: 7, name: "Hallway" });

    renderWithClient(<RenovationPage />);

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("Name"), "Hallway");
    await user.type(screen.getByLabelText(/Budget/), "15000");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/renovation/7"));
    expect(mutateAsync).toHaveBeenCalledWith({ name: "Hallway", budget: 15000 });
  });

  it("shows an inline error and does not submit when the name is blank", async () => {
    const user = userEvent.setup();
    mockUseProjects.mockReturnValue(queryResult({ data: [] }));

    renderWithClient(<RenovationPage />);

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("Name"), "   ");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Give the project a name.");
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
