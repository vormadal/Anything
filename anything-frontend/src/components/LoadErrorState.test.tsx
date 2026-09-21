import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/__tests__/utils/test-utils";
import { LoadErrorState } from "./LoadErrorState";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
}));

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}

describe("LoadErrorState", () => {
  afterEach(() => setOnline(true));

  it("names what failed to load", () => {
    render(<LoadErrorState what="notes" />);

    expect(screen.getByText("Couldn't load notes")).toBeInTheDocument();
  });

  it("blames the server while the browser still thinks it is online", () => {
    render(<LoadErrorState what="lists" />);

    expect(screen.getByText(/something went wrong reaching the server/i)).toBeInTheDocument();
  });

  it("explains the blank section as offline when the browser is offline", () => {
    setOnline(false);

    render(<LoadErrorState what="lists" />);

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });

  it("retries on request", async () => {
    const onRetry = jest.fn();
    render(<LoadErrorState what="bills" onRetry={onRetry} />);

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("has no retry button when the caller has nothing to retry", () => {
    render(<LoadErrorState what="bills" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("disables the retry button while a retry is in flight", () => {
    render(<LoadErrorState what="bills" onRetry={jest.fn()} isRetrying />);

    expect(screen.getByRole("button", { name: /retrying/i })).toBeDisabled();
  });
});
