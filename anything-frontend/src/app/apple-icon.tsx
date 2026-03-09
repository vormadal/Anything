import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const logoData = readFileSync(join(process.cwd(), "public/logo.png"));
const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <img src={logoSrc} width={180} height={180} alt="Anything App" />
    ),
    { width: 180, height: 180 }
  );
}
