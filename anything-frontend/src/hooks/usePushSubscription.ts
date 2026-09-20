"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getExistingSubscription,
  isPushSupported,
  subscribeToPush,
  toSubscriptionKeys,
} from "@/lib/push";
import {
  usePushConfig,
  useRegisterPushDevice,
  useRemovePushDevice,
} from "@/hooks/useNotifications";

/**
 * Why push is or isn't available on this device, as one value the UI can
 * switch on. Kept deliberately explicit rather than a pair of booleans: "the
 * server has no keys" and "you said no" need different copy, and collapsing
 * them into "unavailable" is what makes push features feel broken.
 */
export type PushStatus =
  /** Still reading the browser's current subscription. */
  | "loading"
  /** This browser can't do Web Push (iOS Safari before install-to-home-screen). */
  | "unsupported"
  /** This deployment has no VAPID keys configured. */
  | "unavailable"
  /** The user blocked notifications; only browser settings can undo it. */
  | "denied"
  | "off"
  | "on";

export interface PushSubscriptionState {
  status: PushStatus;
  /** True while enable/disable is in flight, so the control can be disabled. */
  isBusy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

/**
 * Owns this browser's push subscription: the browser half (permission and
 * PushManager) and the server half (the `PushDevice` row) always move
 * together, because either one alone is useless.
 */
export function usePushSubscription(): PushSubscriptionState {
  const { data: config, isLoading: isConfigLoading } = usePushConfig();
  const registerDevice = useRegisterPushDevice();
  const removeDevice = useRemovePushDevice();

  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isDenied, setIsDenied] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const read = async () => {
      if (!isPushSupported()) {
        if (!cancelled) setIsSubscribed(false);
        return;
      }

      setIsDenied(Notification.permission === "denied");
      const existing = await getExistingSubscription();
      if (!cancelled) setIsSubscribed(existing !== null);
    };

    void read();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    if (!config?.publicKey) return;

    setIsBusy(true);
    try {
      const subscription = await subscribeToPush(config.publicKey);
      if (!subscription) {
        // Denied, or the browser refused. Re-read rather than assuming which:
        // a dismissed prompt leaves permission at "default", not "denied".
        setIsDenied(
          typeof Notification !== "undefined" && Notification.permission === "denied"
        );
        return;
      }

      // Server first, state second — if registration fails the browser has a
      // subscription the server doesn't know about, and showing it as "on"
      // would promise notifications that can never arrive.
      await registerDevice.mutateAsync(toSubscriptionKeys(subscription));
      setIsSubscribed(true);
      setIsDenied(false);
    } finally {
      setIsBusy(false);
    }
  }, [config?.publicKey, registerDevice]);

  const disable = useCallback(async () => {
    setIsBusy(true);
    try {
      const subscription = await getExistingSubscription();
      if (subscription) {
        // Tell the server before dropping it locally: afterwards the endpoint
        // is gone and there'd be nothing left to identify the row by.
        await removeDevice.mutateAsync(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } finally {
      setIsBusy(false);
    }
  }, [removeDevice]);

  return { status: resolveStatus(), isBusy, enable, disable };

  function resolveStatus(): PushStatus {
    if (!isPushSupported()) return "unsupported";
    if (isConfigLoading || isSubscribed === null) return "loading";
    if (!config?.enabled) return "unavailable";
    if (isSubscribed) return "on";
    // Checked after "on": a subscription that predates a later block should
    // still read as on rather than silently flipping to denied.
    if (isDenied) return "denied";
    return "off";
  }
}
