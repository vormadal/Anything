import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import NotesPage from "./page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/notes",
}));

const mockNotesGet = jest.fn();
jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      notes: { get: (...args: unknown[]) => mockNotesGet(...args) },
    },
  },
}));

describe("NotesPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists notes with their snippets", async () => {
    mockNotesGet.mockResolvedValue([
      { id: 1, title: "Wifi password", snippet: "Guest network is open" },
      { id: 2, title: "Packing list", snippet: null },
    ]);

    renderWithClient(<NotesPage />);

    await waitFor(() => expect(screen.getByText("Wifi password")).toBeInTheDocument());
    expect(screen.getByText("Guest network is open")).toBeInTheDocument();
    expect(screen.getByText("Packing list")).toBeInTheDocument();
  });

  it("navigates to a note when its row is clicked", async () => {
    const user = userEvent.setup();
    mockNotesGet.mockResolvedValue([{ id: 7, title: "Wifi password", snippet: null }]);

    renderWithClient(<NotesPage />);

    await waitFor(() => expect(screen.getByText("Wifi password")).toBeInTheDocument());
    await user.click(screen.getByText("Wifi password"));

    expect(mockPush).toHaveBeenCalledWith("/notes/7");
  });

  it("shows an empty state when there are no notes", async () => {
    mockNotesGet.mockResolvedValue([]);

    renderWithClient(<NotesPage />);

    await waitFor(() => expect(screen.getByText(/No notes yet/)).toBeInTheDocument());
  });

  it("shows an error state when the request fails", async () => {
    mockNotesGet.mockRejectedValue(new Error("boom"));

    renderWithClient(<NotesPage />);

    await waitFor(() =>
      expect(screen.getByText(/Failed to load notes/)).toBeInTheDocument()
    );
  });

  it("exposes a create action in the header", async () => {
    mockNotesGet.mockResolvedValue([]);

    renderWithClient(<NotesPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("Create note")).toHaveAttribute("href", "/notes/new")
    );
  });
});
