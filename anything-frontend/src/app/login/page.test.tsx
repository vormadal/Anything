import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import LoginPage from "./page";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("should render login form", () => {
    renderWithClient(<LoginPage />);

    expect(screen.getByText("Welcome to Anything")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("should handle successful login", async () => {
    const mockLoginResponse = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      email: "admin@anything.local",
      name: "Administrator",
      role: "Admin",
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLoginResponse,
    });

    renderWithClient(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "admin@anything.local" } });
    fireEvent.change(passwordInput, { target: { value: "Admin123!" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });

    expect(localStorage.getItem("accessToken")).toBe("test-access-token");
  });

  it("should display error on failed login", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    renderWithClient(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "wrong@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
