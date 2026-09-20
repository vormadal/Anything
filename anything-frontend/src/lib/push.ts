/**
 * Browser-side Web Push plumbing. Everything here talks to the browser's
 * PushManager; the server side is in `useNotifications.ts`.
 */

/**
 * Whether this browser can do Web Push at all. Notably false on iOS Safari
 * until the app is installed to the home screen, which is why the UI asks
 * rather than assuming — an install-only capability shouldn't read as an error.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * The VAPID public key travels as base64url, but `applicationServerKey` wants
 * raw bytes. Padding has to be restored first — base64url drops it, and
 * `atob` rejects an unpadded string.
 */
export function vapidKeyToBytes(base64UrlKey: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64UrlKey.length % 4)) % 4);
  const base64 = (base64UrlKey + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);

  // Backed by an explicit ArrayBuffer: `applicationServerKey` requires an
  // ArrayBufferView<ArrayBuffer>, and a bare `new Uint8Array(n)` widens to
  // ArrayBufferLike (which could be a SharedArrayBuffer) and is rejected.
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

/** The two keys the server needs, extracted from a browser subscription. */
export interface PushSubscriptionKeys {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

function encodeKey(subscription: PushSubscription, name: "p256dh" | "auth"): string {
  const key = subscription.getKey(name);
  if (!key) return "";

  // btoa over a byte string, then base64url — the encoding the server stores
  // and the push protocol expects.
  const bytes = new Uint8Array(key);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function toSubscriptionKeys(subscription: PushSubscription): PushSubscriptionKeys {
  return {
    endpoint: subscription.endpoint,
    p256dhKey: encodeKey(subscription, "p256dh"),
    authKey: encodeKey(subscription, "auth"),
  };
}

/**
 * The subscription this browser already has, if any. Returns null rather than
 * throwing when there's no registered worker yet — on a first load the
 * registration can still be pending.
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;

  return registration.pushManager.getSubscription();
}

/**
 * Asks the browser to subscribe, prompting for permission if it hasn't been
 * decided. Returns null when the user denies — a refusal is an answer, not an
 * error to surface as a failure.
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  // `ready` rather than `getRegistration`: subscribing needs an *active*
  // worker, and on a first visit the one just registered may still be
  // installing.
  const registration = await navigator.serviceWorker.ready;

  return registration.pushManager.subscribe({
    // Required by every current browser — a push that can't be shown to the
    // user isn't allowed.
    userVisibleOnly: true,
    applicationServerKey: vapidKeyToBytes(vapidPublicKey),
  });
}
