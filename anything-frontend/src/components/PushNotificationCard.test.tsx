import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PushNotificationCard } from "@/components/PushNotificationCard";

const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

let mockStatus = "off";
let mockIsBusy = false;
const mockEnable = jest.fn();
const mockDisable = jest.fn();

jest.mock("@/hooks/usePushSubscription", () => ({
  usePushSubscription: () => ({
    status: mockStatus,
    isBusy: mockIsBusy,
    enable: mockEnable,
    disable: mockDisable,
  }),
}));

describe("PushNotificationCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = "off";
    mockIsBusy = false;
    mockEnable.mockResolvedValue(undefined);
    mockDisable.mockResolvedValue(undefined);
  });

  it.each(["loading", "unavailable"])("renders nothing while %s", (status) => {
    // Nothing to offer and nothing the user can act on — a disabled control
    // explaining a server-side config gap is just noise.
    mockStatus = status;
    const { container } = render(<PushNotificationCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers to turn push on for this device", async () => {
    const user = userEvent.setup();
    render(<PushNotificationCard />);

    await user.click(screen.getByRole("button", { name: /turn on/i }));

    expect(mockEnable).toHaveBeenCalled();
  });

  it("offers to turn push off once it is on", async () => {
    const user = userEvent.setup();
    mockStatus = "on";
    render(<PushNotificationCard />);

    await user.click(screen.getByRole("button", { name: /turn off/i }));

    expect(mockDisable).toHaveBeenCalled();
  });

  it("explains a block instead of offering a button that cannot work", () => {
    // Once blocked, the prompt can't be shown again from script.
    mockStatus = "denied";
    render(<PushNotificationCard />);

    expect(screen.getByText(/blocked for this site/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("points iOS users at install-to-home-screen rather than calling it an error", () => {
    mockStatus = "unsupported";
    render(<PushNotificationCard />);

    expect(screen.getByText(/add the app to your home screen/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("reports a failed subscribe instead of failing silently", async () => {
    // enable() rejects when the browser refuses or the server call fails.
    // Unhandled, the button would just stop spinning and the user would be
    // left with no notifications and no explanation.
    const user = userEvent.setup();
    mockEnable.mockRejectedValue(new Error("boom"));
    render(<PushNotificationCard />);

    await user.click(screen.getByRole("button", { name: /turn on/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/turn on notifications/i))
    );
  });

  it("reports a failed unsubscribe too", async () => {
    const user = userEvent.setup();
    mockStatus = "on";
    mockDisable.mockRejectedValue(new Error("boom"));
    render(<PushNotificationCard />);

    await user.click(screen.getByRole("button", { name: /turn off/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/turn off notifications/i))
    );
  });

  it("stays quiet when the action succeeds", async () => {
    const user = userEvent.setup();
    mockEnable.mockResolvedValue(undefined);
    render(<PushNotificationCard />);

    await user.click(screen.getByRole("button", { name: /turn on/i }));

    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("disables the control while a subscribe is in flight", () => {
    mockIsBusy = true;
    render(<PushNotificationCard />);

    expect(screen.getByRole("button", { name: /turning on/i })).toBeDisabled();
  });
});
