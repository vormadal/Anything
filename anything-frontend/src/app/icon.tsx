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
  // Maskable icons (512) must fill the entire canvas — no border radius —
  // so the OS can apply its own shape clipping without showing a browser badge.
  // Regular icons (192, purpose "any") keep rounded corners.
  const borderRadius = id === "512" ? 0 : Math.round(size * 0.2);

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
          borderRadius,
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
