import { ImageResponse } from "next/og";

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
  const fontSize = Math.round(size * 0.45);
  const radius = Math.round(size * 0.2);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius,
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1,
          }}
        >
          A
        </span>
      </div>
    ),
    { width: size, height: size }
  );
}
