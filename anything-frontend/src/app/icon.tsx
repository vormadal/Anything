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
    {
      contentType: "image/png" as const,
      size: { width: 512, height: 512 },
      id: "512-maskable",
    },
  ];
}

export default function Icon({ id }: { id: string }) {
  if (id === "512-maskable") {
    const canvasSize = 512;
    const padding = Math.round(canvasSize * 0.1);
    const logoSize = canvasSize - padding * 2;
    return new ImageResponse(
      (
        <div
          style={{
            width: canvasSize,
            height: canvasSize,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={logoSrc}
            width={logoSize}
            height={logoSize}
            alt="Anything App"
          />
        </div>
      ),
      { width: canvasSize, height: canvasSize }
    );
  }

  const size = id === "192" ? 192 : 512;

  return new ImageResponse(
    (
      <img src={logoSrc} width={size} height={size} alt="Anything App" />
    ),
    { width: size, height: size }
  );
}
