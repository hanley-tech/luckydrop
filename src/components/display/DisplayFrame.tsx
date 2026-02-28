"use client";

import { useEffect, useState, ReactNode } from "react";

const DESIGN_W = 3840;
const DESIGN_H = 2160;

interface DisplayFrameProps {
  children: ReactNode;
}

/**
 * Renders children at a fixed 3840x2160 resolution, then CSS-scales
 * the whole frame to fit the actual viewport (letterboxed / pillarboxed).
 * This guarantees identical layout on any screen size.
 */
export default function DisplayFrame({ children }: DisplayFrameProps) {
  const [style, setStyle] = useState<React.CSSProperties>({
    width: DESIGN_W,
    height: DESIGN_H,
    transform: "scale(1)",
    transformOrigin: "top left",
    position: "absolute",
    top: 0,
    left: 0,
    overflow: "hidden",
  });

  useEffect(() => {
    function update() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / DESIGN_W, vh / DESIGN_H);
      // Center the scaled frame
      const scaledW = DESIGN_W * s;
      const scaledH = DESIGN_H * s;
      const offsetX = (vw - scaledW) / 2;
      const offsetY = (vh - scaledH) / 2;

      setStyle({
        width: DESIGN_W,
        height: DESIGN_H,
        transform: `translate(${offsetX}px, ${offsetY}px) scale(${s})`,
        transformOrigin: "top left",
        position: "absolute",
        top: 0,
        left: 0,
        overflow: "hidden",
      });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000",
        position: "relative",
      }}
    >
      <div style={style}>{children}</div>
    </div>
  );
}
