import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { CreateVendorDialog } from "./CreateVendorDialog";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/bills/new",
}));

const mockCreateVendorMutateAsync = jest.fn();
jest.mock("@/hooks/useVendors", () => ({
  useCreateVendor: () => ({ mutateAsync: mockCreateVendorMutateAsync, isPending: false }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

describe("CreateVendorDialog", () => {
  const onCreated = jest.fn();
  const onCancel = jest.fn();

  afterEach(() => {
    setOnline(true);
    jest.clearAllMocks();
  });

  it("creates a vendor and calls onCreated", async () => {
    const user = userEvent.setup();
    mockCreateVendorMutateAsync.mockResolvedValueOnce({ id: 1, name: "Netflix" });
    renderWithClient(
      <CreateVendorDialog initialName="Netflix" onCreated={onCreated} onCancel={onCancel} />
    );

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(mockCreateVendorMutateAsync).toHaveBeenCalledWith({ name: "Netflix", website: undefined });
    expect(onCreated).toHaveBeenCalledWith({ id: 1, name: "Netflix" });
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <CreateVendorDialog initialName="Netflix" onCreated={onCreated} onCancel={onCancel} />
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("disables Create while offline", () => {
    setOnline(false);
    renderWithClient(
      <CreateVendorDialog initialName="Netflix" onCreated={onCreated} onCancel={onCancel} />
    );

    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });
});
