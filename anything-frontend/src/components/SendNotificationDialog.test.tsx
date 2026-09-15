import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { SendNotificationDialog } from "@/components/SendNotificationDialog";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/notifications",
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const mockPost = jest.fn();
jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      notifications: { post: (...args: unknown[]) => mockPost(...args) },
    },
  },
}));

function renderDialog(onOpenChange = jest.fn()) {
  renderWithClient(<SendNotificationDialog open onOpenChange={onOpenChange} />);
  return onOpenChange;
}

describe("SendNotificationDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("cannot be submitted without a title", async () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("sends the title and body, and closes", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ recipients: 3 });
    const onOpenChange = renderDialog();

    await user.type(screen.getByLabelText("Title"), "Bin day moved");
    await user.type(screen.getByLabelText(/Message/), "Thursday this week.");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith({
        title: "Bin day moved",
        body: "Thursday this week.",
        includeSelf: false,
      })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sends a null body when the message is left blank", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ recipients: 1 });
    renderDialog();

    await user.type(screen.getByLabelText("Title"), "Heads up");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith({
        title: "Heads up",
        body: null,
        includeSelf: false,
      })
    );
  });

  it("reports the recipient count, which the sender cannot otherwise see", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ recipients: 3 });
    renderDialog();

    await user.type(screen.getByLabelText("Title"), "Bin day moved");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith("Sent to 3 household members")
    );
  });

  it("singularises the recipient count", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ recipients: 1 });
    renderDialog();

    await user.type(screen.getByLabelText("Title"), "Bin day moved");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith("Sent to 1 household member")
    );
  });

  it("keeps the dialog open and reports the failure when the send fails", async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValue(new Error("boom"));
    const onOpenChange = renderDialog();

    await user.type(screen.getByLabelText("Title"), "Bin day moved");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
