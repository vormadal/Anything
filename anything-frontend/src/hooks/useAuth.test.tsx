import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useLogin, useLogout, setTokens, clearTokens, getAccessToken, getRefreshToken } from "@/hooks/useAuth";

// Mock fetch globally
global.fetch = jest.fn();

// Create a wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
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

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      });

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        await result.current.mutateAsync({
          email: "test@example.com",
          password: "password123",
        });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/auth/login",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        })
      );

      expect(getAccessToken()).toBe("test-access-token");
      expect(getRefreshToken()).toBe("test-refresh-token");
    });

    it("should throw error on invalid credentials", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

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
});
