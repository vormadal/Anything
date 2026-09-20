import {
  isPushSupported,
  toSubscriptionKeys,
  vapidKeyToBytes,
} from "@/lib/push";

describe("vapidKeyToBytes", () => {
  it("decodes a real unpadded VAPID key to its 65 raw bytes", () => {
    // A P-256 public key is 65 bytes (0x04 || X || Y), which base64url-encodes
    // to 87 characters with no padding — the case atob would reject untouched.
    const key =
      "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM";

    const bytes = vapidKeyToBytes(key);

    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(0x04);
  });

  it("restores padding so lengths that aren't a multiple of four still decode", () => {
    // "aGk" is "hi" with one padding character stripped.
    expect(Array.from(vapidKeyToBytes("aGk"))).toEqual([104, 105]);
  });

  it("maps the base64url alphabet back to standard base64", () => {
    // 0xFB 0xFF encodes as "-_8" in base64url and "+/8" in standard base64;
    // decoding the url form is what proves the substitution happens.
    expect(Array.from(vapidKeyToBytes("-_8"))).toEqual([0xfb, 0xff]);
  });

  it("produces a buffer the PushManager will accept", () => {
    // applicationServerKey rejects a SharedArrayBuffer-backed view, so the
    // backing store must be a plain ArrayBuffer.
    expect(vapidKeyToBytes("aGk").buffer).toBeInstanceOf(ArrayBuffer);
  });
});

describe("toSubscriptionKeys", () => {
  function fakeSubscription(keys: Record<string, Uint8Array | null>) {
    return {
      endpoint: "https://push.example.com/abc",
      getKey: (name: string) => {
        const value = keys[name];
        return value ? value.buffer : null;
      },
    } as unknown as PushSubscription;
  }

  it("base64url-encodes the browser's raw keys", () => {
    const subscription = fakeSubscription({
      p256dh: new Uint8Array([0xfb, 0xff]),
      auth: new Uint8Array([104, 105]),
    });

    const keys = toSubscriptionKeys(subscription);

    expect(keys.endpoint).toBe("https://push.example.com/abc");
    // base64url, unpadded — not "+/8=" / "aGk=".
    expect(keys.p256dhKey).toBe("-_8");
    expect(keys.authKey).toBe("aGk");
  });

  it("yields an empty string for a key the browser didn't provide", () => {
    const keys = toSubscriptionKeys(fakeSubscription({ p256dh: null, auth: null }));

    expect(keys.p256dhKey).toBe("");
    expect(keys.authKey).toBe("");
  });
});

describe("isPushSupported", () => {
  it("is false in an environment without a PushManager", () => {
    // jsdom has no PushManager, which is also what iOS Safari looks like
    // before the app is installed to the home screen.
    expect(isPushSupported()).toBe(false);
  });
});
