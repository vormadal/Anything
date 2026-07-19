import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import RegisterPage from "./page";
import { toast } from "sonner";

// Mock the apiClient module
const mockRegisterPost = jest.fn()

jest.mock('@/lib/apiClient', () => {
  class ApiError extends Error {
    responseStatusCode: number | undefined;
    constructor(message?: string) {
      super(message)
      this.name = 'DefaultApiError'
    }
  }
  return {
    apiClient: {
      api: {
        auth: {
          register: { post: (...args: unknown[]) => mockRegisterPost(...args) },
        },
      },
    },
    ApiError,
  }
})

// Mock next/navigation
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/register',
}));

// Mock toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockSearchParams.delete("token");
  });

  describe("Invite Token Validation", () => {
    it("should show error when no invite token is present", () => {
      renderWithClient(<RegisterPage />);

      expect(screen.getByText("Invalid Invite")).toBeInTheDocument();
      expect(screen.getByText("No invite token found. Please use the invite link sent to you.")).toBeInTheDocument();
      expect(screen.queryByText("Create Account")).not.toBeInTheDocument();
    });

    it("should navigate to login when clicking 'Go to Login' button without token", async () => {
      const user = userEvent.setup();

      renderWithClient(<RegisterPage />);

      const loginButton = screen.getByRole("button", { name: "Go to Login" });
      await user.click(loginButton);

      expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("should show registration form when valid invite token is present", () => {
      mockSearchParams.set("token", "valid-token");

      renderWithClient(<RegisterPage />);

      expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
      expect(screen.getByText("Complete your registration")).toBeInTheDocument();
      expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });
  });

  describe("Registration Form", () => {
    beforeEach(() => {
      mockSearchParams.set("token", "valid-token");
    });

    it("should successfully register a new user", async () => {
      const user = userEvent.setup();

      mockRegisterPost.mockResolvedValueOnce(undefined);

      renderWithClient(<RegisterPage />);

      const nameInput = screen.getByLabelText("Full Name");
      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");

      await user.type(nameInput, "John Doe");
      await user.type(emailInput, "john@test.com");
      await user.type(passwordInput, "Password123");

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegisterPost).toHaveBeenCalledWith({
          email: "john@test.com",
          password: "Password123",
          name: "John Doe",
          inviteToken: "valid-token",
        });
      });

      expect(toast.success).toHaveBeenCalledWith("Registration successful! Please login.");
      expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("should show error when required fields are empty", async () => {
      const user = userEvent.setup();

      renderWithClient(<RegisterPage />);

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      await user.click(submitButton);

      // Form should not submit since inputs have 'required' attribute
      expect(mockRegisterPost).not.toHaveBeenCalled();
    });

    it("should show error when name is missing", async () => {
      const user = userEvent.setup();

      renderWithClient(<RegisterPage />);

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");

      await user.type(emailInput, "john@test.com");
      await user.type(passwordInput, "Password123");

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      await user.click(submitButton);

      expect(mockRegisterPost).not.toHaveBeenCalled();
    });

    it("should show error when email is missing", async () => {
      const user = userEvent.setup();

      renderWithClient(<RegisterPage />);

      const nameInput = screen.getByLabelText("Full Name");
      const passwordInput = screen.getByLabelText("Password");

      await user.type(nameInput, "John Doe");
      await user.type(passwordInput, "Password123");

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      await user.click(submitButton);

      expect(mockRegisterPost).not.toHaveBeenCalled();
    });

    it("should show error when password is missing", async () => {
      const user = userEvent.setup();

      renderWithClient(<RegisterPage />);

      const nameInput = screen.getByLabelText("Full Name");
      const emailInput = screen.getByLabelText("Email");

      await user.type(nameInput, "John Doe");
      await user.type(emailInput, "john@test.com");

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      await user.click(submitButton);

      expect(mockRegisterPost).not.toHaveBeenCalled();
    });

    it("should show error when password is too short", async () => {
      const user = userEvent.setup();

      renderWithClient(<RegisterPage />);

      const nameInput = screen.getByLabelText("Full Name");
      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");

      await user.type(nameInput, "John Doe");
      await user.type(emailInput, "john@test.com");
      await user.type(passwordInput, "short");

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      await user.click(submitButton);

      expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();
      expect(mockRegisterPost).not.toHaveBeenCalled();
    });

    it("should handle registration failure", async () => {
      const user = userEvent.setup();

      mockRegisterPost.mockRejectedValueOnce(new Error("Email already exists"));

      renderWithClient(<RegisterPage />);

      const nameInput = screen.getByLabelText("Full Name");
      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");

      await user.type(nameInput, "John Doe");
      await user.type(emailInput, "existing@test.com");
      await user.type(passwordInput, "Password123");

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      await user.click(submitButton);

      expect(await screen.findByText("Email already exists")).toBeInTheDocument();

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should show generic error when registration fails without message", async () => {
      const user = userEvent.setup();

      mockRegisterPost.mockRejectedValueOnce(new Error("Registration failed"));

      renderWithClient(<RegisterPage />);

      const nameInput = screen.getByLabelText("Full Name");
      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");

      await user.type(nameInput, "John Doe");
      await user.type(emailInput, "john@test.com");
      await user.type(passwordInput, "Password123");

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      await user.click(submitButton);

      expect(await screen.findByText("Registration failed")).toBeInTheDocument();
    });

    it("should show loading state while registering", async () => {
      const user = userEvent.setup();

      mockRegisterPost.mockImplementation(
        () => new Promise((resolve) => { setTimeout(() => resolve(undefined), 100); })
      );

      renderWithClient(<RegisterPage />);

      const nameInput = screen.getByLabelText("Full Name");
      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");

      await user.type(nameInput, "John Doe");
      await user.type(emailInput, "john@test.com");
      await user.type(passwordInput, "Password123");

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      await user.click(submitButton);

      expect(screen.getByRole("button", { name: "Creating account..." })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Creating account..." })).toBeDisabled();
    });
  });

  describe("Navigation", () => {
    beforeEach(() => {
      mockSearchParams.set("token", "valid-token");
    });

    it("should navigate to login when clicking 'Already have an account' link", async () => {
      const user = userEvent.setup();

      renderWithClient(<RegisterPage />);

      const loginLink = screen.getByText("Already have an account? Sign in");
      await user.click(loginLink);

      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  describe("Form Inputs", () => {
    beforeEach(() => {
      mockSearchParams.set("token", "valid-token");
    });

    it("should have required attribute on all input fields", () => {
      renderWithClient(<RegisterPage />);

      const nameInput = screen.getByLabelText("Full Name") as HTMLInputElement;
      const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
      const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;

      expect(nameInput.required).toBe(true);
      expect(emailInput.required).toBe(true);
      expect(passwordInput.required).toBe(true);
    });

    it("should have email type on email input", () => {
      renderWithClient(<RegisterPage />);

      const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
      expect(emailInput.type).toBe("email");
    });

    it("should have password type on password input", () => {
      renderWithClient(<RegisterPage />);

      const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
      expect(passwordInput.type).toBe("password");
    });

    it("should have minLength attribute on password input", () => {
      renderWithClient(<RegisterPage />);

      const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
      expect(passwordInput.minLength).toBe(8);
    });

    it("should have appropriate placeholder text", () => {
      renderWithClient(<RegisterPage />);

      expect(screen.getByPlaceholderText("John Doe")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("john@example.com")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Minimum 8 characters")).toBeInTheDocument();
    });
  });
});
