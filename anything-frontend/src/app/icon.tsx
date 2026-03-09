import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

const logoData = readFileSync(join(process.cwd(), "public/logo.png"));
const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

export function generateImageMetadata() {
  return [
    {
      contentType: "image/png" as const,
      size: { width: 192, height: 192 },
      id: "192",
    },
    {
      contentType: "image/png" as const,
      size: { width: 512, height: 512 },
      id: "512",
    },
  ];
}

export default function Icon({ id }: { id: string }) {
  const size = id === "192" ? 192 : 512;

  return new ImageResponse(
    (
      <img src={logoSrc} width={size} height={size} alt="Anything App" />
    ),
    { width: size, height: size }
  );
}
