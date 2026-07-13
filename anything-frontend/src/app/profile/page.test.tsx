import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import ProfilePage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/profile",
}));

const mockUpdateProfileMutateAsync = jest.fn();
const mockChangePasswordMutateAsync = jest.fn();

jest.mock("@/hooks/useAuth", () => ({
  useCurrentUser: () => ({ data: { email: "user@example.com", name: "Test User", role: "Member" } }),
  useUpdateProfile: () => ({ mutateAsync: mockUpdateProfileMutateAsync, isPending: false }),
  useChangePassword: () => ({ mutateAsync: mockChangePasswordMutateAsync, isPending: false }),
  getUser: () => ({ email: "user@example.com", name: "Test User", role: "Member" }),
}));

jest.mock("@/lib/apiClient", () => {
  class ApiError extends Error {
    responseStatusCode: number | undefined;
  }
  return { ApiError };
});

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

describe("ProfilePage", () => {
  afterEach(() => {
    setOnline(true);
    jest.clearAllMocks();
  });

  it("renders the profile and password forms", () => {
    renderWithClient(<ProfilePage />);
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change Password" })).toBeInTheDocument();
  });

  it("submits the name form", async () => {
    const user = userEvent.setup();
    mockUpdateProfileMutateAsync.mockResolvedValueOnce(undefined);
    renderWithClient(<ProfilePage />);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "New Name");
    await user.click(screen.getByRole("button", { name: "Save Name" }));

    expect(mockUpdateProfileMutateAsync).toHaveBeenCalledWith({ name: "New Name" });
  });

  it("submits the change password form", async () => {
    const user = userEvent.setup();
    mockChangePasswordMutateAsync.mockResolvedValueOnce(undefined);
    renderWithClient(<ProfilePage />);

    await user.type(screen.getByLabelText("Current Password"), "oldpassword");
    await user.type(screen.getByLabelText("New Password"), "newpassword123");
    await user.type(screen.getByLabelText("Confirm New Password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(mockChangePasswordMutateAsync).toHaveBeenCalledWith({
      currentPassword: "oldpassword",
      newPassword: "newpassword123",
    });
  });

  it("disables writes while offline", () => {
    setOnline(false);
    renderWithClient(<ProfilePage />);

    expect(screen.getByRole("button", { name: "Save Name" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Change Password" })).toBeDisabled();
  });
});
