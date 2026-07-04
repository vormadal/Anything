"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/apiClient";

// Storage keys
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

// Token management
export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return null;
}

export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
}

export function clearTokens(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function setUser(user: { email: string; name: string; role: string }): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getUser(): { email: string; name: string; role: string } | null {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
}

// Login mutation
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: {
      email: string;
      password: string;
    }) => {
      try {
        const data = await apiClient.api.auth.login.post({
          email: credentials.email,
          password: credentials.password,
        });
        if (!data) throw new Error("Login failed");
        return data;
      } catch (err) {
        if (err instanceof ApiError && err.responseStatusCode === 401) {
          throw new Error("Invalid email or password");
        }
        throw new Error("Login failed");
      }
    },
    onSuccess: (data) => {
      setTokens(data.accessToken ?? "", data.refreshToken ?? "");
      setUser({
        email: data.email ?? "",
        name: data.name ?? "",
        role: data.role ?? "",
      });
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    },
  });
}

// Logout
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      clearTokens();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      queryClient.clear();
    },
  });
}

// Register with invite
export function useRegister() {
  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      name: string;
      inviteToken: string;
    }) => {
      try {
        await apiClient.api.auth.register.post({
          email: data.email,
          password: data.password,
          name: data.name,
          inviteToken: data.inviteToken,
        });
      } catch (err) {
        if (err instanceof ApiError) {
          throw new Error(err.message || "Registration failed");
        }
        throw err;
      }
    },
  });
}

// Refresh token
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const data = await apiClient.api.auth.refresh.post({ refreshToken });
    if (!data) {
      clearTokens();
      return null;
    }
    setTokens(data.accessToken ?? "", data.refreshToken ?? "");
    return data.accessToken ?? null;
  } catch {
    clearTokens();
    return null;
  }
}

// Create invite (admin only)
export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; householdId?: number | null }) =>
      apiClient.api.auth.invites.post({ email: data.email, householdId: data.householdId ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "invites"] });
    },
  });
}

// List invites (admin only)
export function useInvites() {
  return useQuery({
    queryKey: ["auth", "invites"],
    queryFn: () => apiClient.api.auth.invites.get(),
  });
}

// Delete invite (admin only)
export function useDeleteInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.auth.invites.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "invites"] });
    },
  });
}

export interface PendingInvite {
  id: number;
  token: string;
  email: string;
  householdId: number | null;
  householdName: string | null;
  expiresAt: string;
  inviteUrl: string;
}

// Get pending household invites for the current user
export function useMyPendingInvites() {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["auth", "invites", "me"],
    queryFn: async (): Promise<PendingInvite[]> => {
      const invites = await apiClient.api.auth.invites.me.get();
      return (invites ?? []).map((invite) => ({
        id: invite.id ?? 0,
        token: invite.token ?? "",
        email: invite.email ?? "",
        householdId: invite.householdId ?? null,
        householdName: invite.householdName ?? null,
        expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : "",
        inviteUrl: invite.inviteUrl ?? "",
      }));
    },
    enabled: isAuthenticated,
  });
}

// Accept a household invite by token (for existing users).
// The generated client types this path segment as a numeric id because it
// shares a URL prefix with the numeric DeleteInvite route ("/invites/{id}");
// the value is only ever used as a raw path segment, so passing the string
// token through is safe at runtime despite the numeric type.
export function useAcceptHouseholdInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string): Promise<void> => {
      try {
        await apiClient.api.auth.invites.byId(token as unknown as number).accept.post();
      } catch (err) {
        // A mapped 400 (HttpValidationProblemDetails) deserializes to a plain object,
        // not a DefaultApiError instance, so this checks the shape instead of `instanceof`.
        const validationErrors =
          typeof err === "object" && err !== null
            ? (err as { errors?: { additionalData?: Record<string, unknown> } }).errors?.additionalData
            : undefined;
        const messages = validationErrors
          ? Object.values(validationErrors).flat().filter((m): m is string => typeof m === "string")
          : [];
        throw new Error(messages.join(" ") || "Failed to accept invite");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "invites", "me"] });
    },
  });
}

// Update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string }) =>
      apiClient.api.auth.profile.put({ name: data.name }),
    onSuccess: (_data, variables) => {
      const currentUser = getUser();
      if (currentUser) {
        setUser({ ...currentUser, name: variables.name });
      }
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    },
  });
}

// Change password
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.api.auth.profile.password.put({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
  });
}

// Get current user
export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "user"],
    queryFn: () => {
      return getUser();
    },
    staleTime: Infinity,
  });
}

// Check if user is authenticated
export function useIsAuthenticated() {
  const { data: user } = useCurrentUser();
  // Fall back to localStorage directly when React Query hasn't resolved yet
  // (e.g., after a page refresh when the in-memory cache is empty)
  return (!!user || !!getUser()) && !!getAccessToken();
}
