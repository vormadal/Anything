import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const fontSize = Math.round(180 * 0.45);
  const radius = Math.round(180 * 0.2);

  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
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
    { width: 180, height: 180 }
  );
}
