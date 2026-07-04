import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useLogin, useLogout, useUpdateProfile, useChangePassword, useMyPendingInvites, useAcceptHouseholdInvite, setTokens, clearTokens, getAccessToken, getRefreshToken, setUser, getUser } from "@/hooks/useAuth";

// Mock the apiClient module
const mockLoginPost = jest.fn()
const mockProfilePut = jest.fn()
const mockPasswordPut = jest.fn()
const mockInvitesMeGet = jest.fn()
const mockInviteAcceptPost = jest.fn()
const mockInvitesById = jest.fn(() => ({ accept: { post: mockInviteAcceptPost } }))

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
          invites: {
            post: jest.fn(),
            me: { get: (...args: unknown[]) => mockInvitesMeGet(...args) },
            byId: (...args: unknown[]) => mockInvitesById(...args),
          },
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
      queries: { retry: false, gcTime: 0 },
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

  describe("useMyPendingInvites", () => {
    it("fetches and normalizes pending invites when authenticated", async () => {
      setTokens("access-token", "refresh-token");
      setUser({ email: "test@example.com", name: "Test User", role: "User" });
      mockInvitesMeGet.mockResolvedValueOnce([
        { id: 1, token: "tok", email: "a@b.c", householdId: 5, householdName: "Home", inviteUrl: "/invite/tok" },
      ]);

      const { result } = renderHook(() => useMyPendingInvites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([
        {
          id: 1,
          token: "tok",
          email: "a@b.c",
          householdId: 5,
          householdName: "Home",
          expiresAt: "",
          inviteUrl: "/invite/tok",
        },
      ]);
    });

    it("does not fetch when not authenticated", async () => {
      const { result } = renderHook(() => useMyPendingInvites(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockInvitesMeGet).not.toHaveBeenCalled();
    });
  });

  describe("useAcceptHouseholdInvite", () => {
    it("accepts an invite by token", async () => {
      mockInviteAcceptPost.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAcceptHouseholdInvite(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync("tok-123");
      });

      expect(mockInvitesById).toHaveBeenCalledWith("tok-123");
      expect(mockInviteAcceptPost).toHaveBeenCalled();
    });

    it("surfaces the server's validation message on rejection", async () => {
      mockInviteAcceptPost.mockRejectedValueOnce({
        responseStatusCode: 400,
        errors: { additionalData: { invite: ["This invite has expired."] } },
      });

      const { result } = renderHook(() => useAcceptHouseholdInvite(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync("tok-123")).rejects.toThrow(
        "This invite has expired."
      );
    });

    it("falls back to a generic message for unexpected failures", async () => {
      mockInviteAcceptPost.mockRejectedValueOnce(new Error("network down"));

      const { result } = renderHook(() => useAcceptHouseholdInvite(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync("tok-123")).rejects.toThrow(
        "Failed to accept invite"
      );
    });
  });
});
