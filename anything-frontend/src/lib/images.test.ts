import {
  MAX_UPLOAD_BYTES,
  assertUploadSize,
  downscaleImage,
  isResizableImage,
  prepareImageForUpload,
} from "./images";

describe("downscaleImage", () => {
  it("falls back to the original file when the image cannot be decoded", async () => {
    const file = new File(["not an image"], "photo.jpg", { type: "image/jpeg" });

    // jsdom has no createImageBitmap, so decoding fails and the file is returned.
    await expect(downscaleImage(file)).resolves.toBe(file);
  });
});

describe("isResizableImage", () => {
  it.each([
    ["image/jpeg", true],
    ["image/png", true],
    ["image/webp", true],
    ["image/gif", false],
    ["image/svg+xml", false],
    ["application/pdf", false],
    ["", false],
  ])("returns %s for %s", (type, expected) => {
    const file = new File(["data"], "file", { type });
    expect(isResizableImage(file)).toBe(expected);
  });
});

describe("prepareImageForUpload", () => {
  it("passes non-image files through untouched", async () => {
    const file = new File(["%PDF-1.4"], "manual.pdf", { type: "application/pdf" });
    await expect(prepareImageForUpload(file)).resolves.toBe(file);
  });

  it("passes GIFs through untouched to preserve animation", async () => {
    const file = new File(["GIF89a"], "photo.gif", { type: "image/gif" });
    await expect(prepareImageForUpload(file)).resolves.toBe(file);
  });

  it("passes SVGs through untouched", async () => {
    const file = new File(["<svg/>"], "icon.svg", { type: "image/svg+xml" });
    await expect(prepareImageForUpload(file)).resolves.toBe(file);
  });

  it("returns the original file when it cannot be decoded (jsdom has no createImageBitmap)", async () => {
    const file = new File(["not an image"], "photo.jpg", { type: "image/jpeg" });
    await expect(prepareImageForUpload(file)).resolves.toBe(file);
  });
});

describe("assertUploadSize", () => {
  it("does not throw for a file at or under the cap", () => {
    const file = new File([new Uint8Array(MAX_UPLOAD_BYTES)], "photo.jpg", { type: "image/jpeg" });
    expect(() => assertUploadSize(file)).not.toThrow();
  });

  it("throws with the file's actual size when it exceeds the cap", () => {
    const file = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1024 * 1024)], "photo.jpg", {
      type: "image/jpeg",
    });
    expect(() => assertUploadSize(file)).toThrow(/File is too large \(11\.0 MB\)/);
  });
});
