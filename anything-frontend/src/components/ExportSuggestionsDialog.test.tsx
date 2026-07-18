import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportSuggestionsDialog } from "./ExportSuggestionsDialog";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

describe("ExportSuggestionsDialog", () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    isPending: false,
    onExportAll: jest.fn(),
    onExportUncategorized: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the AI prompt collapsed by default and expands it on click", async () => {
    const user = userEvent.setup();
    render(<ExportSuggestionsDialog {...baseProps} />);

    const summary = screen.getByText("Categorize with an AI");
    // <details> is closed initially, so the copy control isn't reachable yet.
    const details = summary.closest("details")!;
    expect(details.open).toBe(false);

    await user.click(summary);
    expect(details.open).toBe(true);
    expect(screen.getByRole("button", { name: "Copy AI instructions" })).toBeInTheDocument();
  });

  it("copies the prompt, including the household's existing categories", async () => {
    const user = userEvent.setup();
    // userEvent.setup() installs its own clipboard stub; override it so we can assert.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<ExportSuggestionsDialog {...baseProps} categoryNames={["Produce", "Dairy"]} />);

    await user.click(screen.getByText("Categorize with an AI"));
    await user.click(screen.getByRole("button", { name: "Copy AI instructions" }));

    await waitFor(() => expect(mockWriteText).toHaveBeenCalledTimes(1));
    const copied = mockWriteText.mock.calls[0][0] as string;
    expect(copied).toContain('"recommendations"');
    expect(copied).toContain("Produce, Dairy");
  });
});
