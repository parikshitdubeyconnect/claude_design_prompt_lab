"use client";

import { useEffect, useState } from "react";
import QR from "qrcode";

// Renders a real, scannable QR encoding the join URL, on a white tile matching
// the design. Dark modules use the app's deep-navy so it reads on the tile.
export default function QRCode({
  url,
  size = 148,
  radius = 14,
  quiet = 10,
}: {
  url: string;
  size?: number;
  radius?: number;
  quiet?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QR.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 0,
      color: { dark: "#0A1B30", light: "#ffffff" },
      width: 512,
    })
      .then((d) => {
        if (alive) setDataUrl(d);
      })
      .catch(() => {
        if (alive) setDataUrl(null);
      });
    return () => {
      alive = false;
    };
  }, [url]);

  const inner = size - quiet * 2;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={`QR code to join at ${url}`}
          width={inner}
          height={inner}
          style={{ display: "block", imageRendering: "pixelated" }}
        />
      ) : (
        <div style={{ width: inner, height: inner }} />
      )}
    </div>
  );
}
