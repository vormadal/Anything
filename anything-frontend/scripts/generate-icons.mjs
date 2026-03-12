// @ts-check
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
const iconsDir = join(publicDir, "icons");
const logoPath = join(publicDir, "logo.png");

mkdirSync(iconsDir, { recursive: true });

// Logo background color — used as the maskable icon canvas so corners match
// the logo itself rather than being white (white corners cause a ring artefact
// when Android applies circular/rounded adaptive-icon masking).
const LOGO_BG = { r: 0x1c, g: 0x1c, b: 0x26, alpha: 1 };

// Safe zone: 20% padding on each side (Google/PWABuilder recommendation).
// This ensures the fork+knife content sits comfortably inside the safe-zone
// circle even on aggressive circular launchers.
const SAFE_ZONE_RATIO = 0.2;

async function generateIcon(size, filename) {
  await sharp(logoPath).resize(size, size).png().toFile(join(iconsDir, filename));
  console.log(`Generated: public/icons/${filename}`);
}

async function generateMaskableIcon(size, filename) {
  const logoSize = Math.round(size * (1 - SAFE_ZONE_RATIO * 2));
  const padding = Math.floor((size - logoSize) / 2);
  const resizedLogo = await sharp(logoPath).resize(logoSize, logoSize).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: LOGO_BG },
  })
    .composite([{ input: resizedLogo, top: padding, left: padding }])
    .flatten({ background: LOGO_BG })
    .png()
    .toFile(join(iconsDir, filename));
  console.log(`Generated: public/icons/${filename}`);
}

async function generateFavicon() {
  const appDir = join(__dirname, "../src/app");
  const png16 = await sharp(logoPath).resize(16, 16).ensureAlpha().png().toBuffer();
  const png32 = await sharp(logoPath).resize(32, 32).ensureAlpha().png().toBuffer();

  const numImages = 2;
  const headerSize = 6;
  const dirSize = numImages * 16;
  const offset0 = headerSize + dirSize;
  const offset1 = offset0 + png16.length;
  const buf = Buffer.alloc(headerSize + dirSize + png16.length + png32.length);
  let pos = 0;

  buf.writeUInt16LE(0, pos); pos += 2;
  buf.writeUInt16LE(1, pos); pos += 2;
  buf.writeUInt16LE(numImages, pos); pos += 2;

  for (const [size, png, offset] of [[16, png16, offset0], [32, png32, offset1]]) {
    buf.writeUInt8(size, pos); pos++;
    buf.writeUInt8(size, pos); pos++;
    buf.writeUInt8(0, pos); pos++;
    buf.writeUInt8(0, pos); pos++;
    buf.writeUInt16LE(1, pos); pos += 2;
    buf.writeUInt16LE(32, pos); pos += 2;
    buf.writeUInt32LE(png.length, pos); pos += 4;
    buf.writeUInt32LE(offset, pos); pos += 4;
  }

  png16.copy(buf, pos); pos += png16.length;
  png32.copy(buf, pos);

  writeFileSync(join(appDir, "favicon.ico"), buf);
  console.log("Generated: src/app/favicon.ico");
}

await generateIcon(192, "icon-192.png");
await generateIcon(512, "icon-512.png");
await generateMaskableIcon(192, "icon-192-maskable.png");
await generateMaskableIcon(512, "icon-512-maskable.png");
await generateIcon(180, "apple-icon-180.png");
await generateFavicon();

console.log("All icons generated successfully!");
