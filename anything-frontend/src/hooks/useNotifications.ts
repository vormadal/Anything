"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  NotificationPreferenceResponse,
  NotificationResponse,
  PushConfigResponse,
  SendNotificationResponse,
} from "@/lib/api-client/models/index";
import type { PushSubscriptionKeys } from "@/lib/push";

export type { NotificationPreferenceResponse, NotificationResponse };

const NOTIFICATIONS_KEY = ["notifications"] as const;
const UNREAD_COUNT_KEY = ["notificationUnreadCount"] as const;
const PREFERENCES_KEY = ["notificationPreferences"] as const;
const PUSH_CONFIG_KEY = ["notificationPushConfig"] as const;

export interface NotificationListOptions {
  unreadOnly?: boolean;
  limit?: number;
}

/**
 * The signed-in user's inbox for the current household, newest first.
 *
 * Keyed on both options for the same reason `useNotes` keys on its limit: the
 * header popover asks for a short list while `/notifications` asks for the
 * full one, and sharing a key would let the truncated list satisfy the page.
 */
export function useNotifications({ unreadOnly, limit }: NotificationListOptions = {}) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, unreadOnly ?? false, limit ?? null],
    queryFn: async (): Promise<NotificationResponse[]> => {
      const notifications = await apiClient.api.notifications.get({
        queryParameters: { unreadOnly, limit },
      });
      return notifications ?? [];
    },
  });
}

/**
 * Just the badge number. Deliberately its own endpoint and its own query key —
 * the header renders on every page, and it has no use for notification bodies.
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: async (): Promise<number> => {
      const result = await apiClient.api.notifications.unreadCount.get();
      return result?.count ?? 0;
    },
  });
}

/**
 * Invalidates everything a read/dismiss/send can change. The badge and the
 * lists are separate queries, so a mutation that touched one almost always
 * moved the other too.
 */
function useNotificationInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
  };
}

export function useMarkNotificationRead() {
  const invalidate = useNotificationInvalidation();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.notifications.byId(id).read.put(),
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useNotificationInvalidation();

  return useMutation({
    mutationFn: () => apiClient.api.notifications.readAll.put(),
    onSuccess: invalidate,
  });
}

export function useDeleteNotification() {
  const invalidate = useNotificationInvalidation();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.notifications.byId(id).delete(),
    onSuccess: invalidate,
  });
}

export interface SendNotificationInput {
  title: string;
  body?: string | null;
  includeSelf?: boolean;
}

/**
 * Sends an announcement to the household. Manager-only server-side; the
 * response counts notifications actually created, which is lower than the
 * member count when someone has switched announcements off.
 */
export function useSendNotification() {
  const invalidate = useNotificationInvalidation();

  return useMutation({
    mutationFn: async (input: SendNotificationInput): Promise<SendNotificationResponse> => {
      const result = await apiClient.api.notifications.post({
        title: input.title,
        body: input.body,
        includeSelf: input.includeSelf ?? false,
      });
      return result ?? { recipients: 0 };
    },
    onSuccess: invalidate,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: PREFERENCES_KEY,
    queryFn: async (): Promise<NotificationPreferenceResponse[]> => {
      const preferences = await apiClient.api.notifications.preferences.get();
      return preferences ?? [];
    },
  });
}

/**
 * One category's desired state. Both switches are optional and mean "leave as
 * is" — the server treats an omitted one the same way, so flipping in-app
 * never resets the user's push choice or vice versa.
 */
export interface NotificationPreferenceUpdate {
  category: string;
  inAppEnabled?: boolean;
  pushEnabled?: boolean;
}

/**
 * Partial update — only the categories passed are touched, and within each,
 * only the switches actually supplied.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: NotificationPreferenceUpdate[]) =>
      apiClient.api.notifications.preferences.put({ preferences }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PREFERENCES_KEY });
    },
  });
}

/**
 * Whether this deployment has VAPID keys, and the public one if so. Push is
 * opt-in per deployment, so the UI asks rather than assuming — on a server
 * without keys `enabled` is false and the whole push section stays hidden.
 */
export function usePushConfig() {
  return useQuery({
    queryKey: PUSH_CONFIG_KEY,
    // Server configuration, not user data: it cannot change between renders,
    // so there's no reason to refetch it on every mount.
    staleTime: Infinity,
    queryFn: async (): Promise<PushConfigResponse> => {
      const config = await apiClient.api.notifications.push.config.get();
      return config ?? { enabled: false, publicKey: null };
    },
  });
}

/**
 * Registers (or refreshes) this browser's subscription. An upsert server-side
 * on the endpoint, so calling it again for a browser already known is the
 * normal case rather than a duplicate.
 */
export function useRegisterPushDevice() {
  return useMutation({
    mutationFn: (keys: PushSubscriptionKeys) =>
      apiClient.api.notifications.push.devices.post({
        endpoint: keys.endpoint,
        p256dhKey: keys.p256dhKey,
        authKey: keys.authKey,
        userAgent: typeof navigator === "undefined" ? null : navigator.userAgent,
      }),
  });
}

/** Drops this browser's subscription server-side. Idempotent. */
export function useRemovePushDevice() {
  return useMutation({
    mutationFn: (endpoint: string) =>
      apiClient.api.notifications.push.devices.remove.post({ endpoint }),
  });
}
