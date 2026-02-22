"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/apiClient";

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  email: string;
  name: string;
  role: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  inviteToken: string;
}

interface CreateInviteRequest {
  email: string;
}

interface CreateInviteResponse {
  inviteUrl: string;
  token: string;
}

interface UpdateProfileRequest {
  name: string;
}

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
    mutationFn: async (credentials: LoginRequest): Promise<LoginResponse> => {
      try {
        return await apiClient.post<LoginResponse>("/api/auth/login", credentials);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          throw new Error("Invalid email or password");
        }
        throw new Error("Login failed");
      }
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser({ email: data.email, name: data.name, role: data.role });
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
    mutationFn: async (data: RegisterRequest) => {
      try {
        return await apiClient.post("/api/auth/register", data);
      } catch (err) {
        if (err instanceof ApiError) {
          throw new Error(err.body || "Registration failed");
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
    const data = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
    }>("/api/auth/refresh", { refreshToken });
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

// Create invite (admin only)
export function useCreateInvite() {
  return useMutation({
    mutationFn: (data: CreateInviteRequest): Promise<CreateInviteResponse> =>
      apiClient.post<CreateInviteResponse>("/api/auth/invites", data),
  });
}

// Update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) =>
      apiClient.put("/api/auth/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    },
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
  return !!user && !!getAccessToken();
}
