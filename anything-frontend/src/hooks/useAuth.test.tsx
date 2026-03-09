import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useLogin, useLogout, useUpdateProfile, useChangePassword, setTokens, clearTokens, getAccessToken, getRefreshToken, setUser, getUser } from "@/hooks/useAuth";

// Mock the apiClient module
const mockLoginPost = jest.fn()
const mockProfilePut = jest.fn()
const mockPasswordPut = jest.fn()

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
          logout: { post: jest.fn() },
          refresh: { post: jest.fn() },
          register: { post: jest.fn() },
          invites: { post: jest.fn() },
          profile: {
            put: (...args: unknown[]) => mockProfilePut(...args),
            password: { put: (...args: unknown[]) => mockPasswordPut(...args) },
          },
        },
      },
    },
    ApiError,
  }
})

// Create a wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  
  Wrapper.displayName = 'QueryClientWrapper';
  
  return Wrapper;
};

describe("useAuth hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearTokens();
    localStorage.clear();
  });

  describe("useLogin", () => {
    it("should successfully login with valid credentials", async () => {
      const mockLoginResponse = {
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        email: "test@example.com",
        name: "Test User",
        role: "User",
      };

      mockLoginPost.mockResolvedValueOnce(mockLoginResponse);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        await result.current.mutateAsync({
          email: "test@example.com",
          password: "password123",
        });
      });

      expect(mockLoginPost).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });

      expect(getAccessToken()).toBe("test-access-token");
      expect(getRefreshToken()).toBe("test-refresh-token");
    });

    it("should throw error on invalid credentials", async () => {
      const { ApiError } = jest.requireMock('@/lib/apiClient')
      const error = new ApiError("Unauthorized");
      error.responseStatusCode = 401;
      mockLoginPost.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          email: "test@example.com",
          password: "wrongpassword",
        })
      ).rejects.toThrow("Invalid email or password");
    });
  });

  describe("useLogout", () => {
    it("should clear tokens on logout", async () => {
      setTokens("access-token", "refresh-token");

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        await result.current.mutateAsync();
      });

      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe("token storage", () => {
    it("should store and retrieve tokens", () => {
      setTokens("my-access-token", "my-refresh-token");

      expect(getAccessToken()).toBe("my-access-token");
      expect(getRefreshToken()).toBe("my-refresh-token");
    });

    it("should clear tokens", () => {
      setTokens("access", "refresh");
      clearTokens();

      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe("useUpdateProfile", () => {
    it("should update user name in localStorage on success", async () => {
      setUser({ email: "test@example.com", name: "Old Name", role: "User" });
      mockProfilePut.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        await result.current.mutateAsync({ name: "New Name" });
      });

      expect(mockProfilePut).toHaveBeenCalledWith({ name: "New Name" });
      expect(getUser()?.name).toBe("New Name");
    });
  });

  describe("useChangePassword", () => {
    it("should call the password endpoint with current and new password", async () => {
      mockPasswordPut.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        await result.current.mutateAsync({
          currentPassword: "OldPass123!",
          newPassword: "NewPass123!",
        });
      });

      expect(mockPasswordPut).toHaveBeenCalledWith({
        currentPassword: "OldPass123!",
        newPassword: "NewPass123!",
      });
    });
  });
});
