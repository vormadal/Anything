import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { CreateLocationDialog } from "./CreateLocationDialog";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/bills/new",
}));

const mockCreateLocationMutateAsync = jest.fn();
jest.mock("@/hooks/useLocations", () => ({
  useCreateLocation: () => ({ mutateAsync: mockCreateLocationMutateAsync, isPending: false }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

describe("CreateLocationDialog", () => {
  const onCreated = jest.fn();
  const onCancel = jest.fn();

  afterEach(() => {
    setOnline(true);
    jest.clearAllMocks();
  });

  it("creates a location and calls onCreated", async () => {
    const user = userEvent.setup();
    mockCreateLocationMutateAsync.mockResolvedValueOnce({ id: 1, name: "Home" });
    renderWithClient(
      <CreateLocationDialog initialName="Home" onCreated={onCreated} onCancel={onCancel} />
    );

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(mockCreateLocationMutateAsync).toHaveBeenCalledWith("Home");
    expect(onCreated).toHaveBeenCalledWith({ id: 1, name: "Home" });
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <CreateLocationDialog initialName="Home" onCreated={onCreated} onCancel={onCancel} />
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("disables Create while offline", () => {
    setOnline(false);
    renderWithClient(
      <CreateLocationDialog initialName="Home" onCreated={onCreated} onCancel={onCancel} />
    );

    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });
});
