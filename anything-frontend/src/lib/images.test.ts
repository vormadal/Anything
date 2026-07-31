import { downscaleImage } from "./images";

describe("downscaleImage", () => {
  it("falls back to the original file when the image cannot be decoded", async () => {
    const file = new File(["not an image"], "photo.jpg", { type: "image/jpeg" });

    // jsdom has no createImageBitmap, so decoding fails and the file is returned.
    await expect(downscaleImage(file)).resolves.toBe(file);
  });
});
