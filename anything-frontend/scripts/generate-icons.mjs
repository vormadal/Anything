// @ts-check
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
const iconsDir = join(publicDir, "icons");
const logoPath = join(publicDir, "logo.png");

mkdirSync(iconsDir, { recursive: true });

const SAFE_ZONE_RATIO = 0.1; // 10% padding on each side for maskable safe zone

async function generateIcon(size, filename) {
  await sharp(logoPath).resize(size, size).png().toFile(join(iconsDir, filename));
  console.log(`Generated: public/icons/${filename}`);
}

async function generateMaskableIcon(size, filename) {
  const logoSize = Math.round(size * (1 - SAFE_ZONE_RATIO * 2));
  const padding = Math.floor((size - logoSize) / 2);
  const resizedLogo = await sharp(logoPath).resize(logoSize, logoSize).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: resizedLogo, top: padding, left: padding }])
    .png()
    .toFile(join(iconsDir, filename));
  console.log(`Generated: public/icons/${filename}`);
}

await generateIcon(192, "icon-192.png");
await generateIcon(512, "icon-512.png");
await generateMaskableIcon(192, "icon-192-maskable.png");
await generateMaskableIcon(512, "icon-512-maskable.png");
await generateIcon(180, "apple-icon-180.png");

console.log("All icons generated successfully!");
