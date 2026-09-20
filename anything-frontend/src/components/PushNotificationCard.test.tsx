import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PushNotificationCard } from "@/components/PushNotificationCard";

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

  it("disables the control while a subscribe is in flight", () => {
    mockIsBusy = true;
    render(<PushNotificationCard />);

    expect(screen.getByRole("button", { name: /turning on/i })).toBeDisabled();
  });
});
