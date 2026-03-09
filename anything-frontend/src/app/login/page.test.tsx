import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import LoginPage from "./page";

// Mock the apiClient module
const mockLoginPost = jest.fn()

jest.mock('@/lib/apiClient', () => {
  class ApiError extends Error {
    responseStatusCode: number | undefined;
    responseHeaders: Record<string, string[]> | undefined;
    constructor(message?: string) {
      super(message)
      this.name = 'DefaultApiError'
    }
  }
  return {
    apiClient: {
      api: {
        auth: {
          login: { post: (...args: unknown[]) => mockLoginPost(...args) },
        },
      },
    },
    ApiError,
  }
})

// Mock next/navigation
const mockPush = jest.fn();
const mockGet = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
  usePathname: () => '/login',
}));

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockGet.mockReturnValue(null);
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

    mockLoginPost.mockResolvedValueOnce(mockLoginResponse);

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

  it("should redirect to the 'redirect' query param after successful login", async () => {
    const mockLoginResponse = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      email: "admin@anything.local",
      name: "Administrator",
      role: "Admin",
    };

    mockLoginPost.mockResolvedValueOnce(mockLoginResponse);
    mockGet.mockReturnValue("/shopping-lists");

    renderWithClient(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "admin@anything.local" } });
    fireEvent.change(passwordInput, { target: { value: "Admin123!" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/shopping-lists");
    });
  });

  it("should display error on failed login", async () => {
    const { ApiError } = jest.requireMock('@/lib/apiClient')
    const error = new ApiError("Unauthorized");
    error.responseStatusCode = 401;
    mockLoginPost.mockRejectedValueOnce(error);

    renderWithClient(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "wrong@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLoginPost).toHaveBeenCalled();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
