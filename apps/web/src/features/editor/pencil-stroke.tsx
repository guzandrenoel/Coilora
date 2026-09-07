import { memo } from "react";
import type { AnnotationPoint } from "@/lib/api/types";
import { pencilTexture } from "./pencil-texture";

export const PencilStroke = memo(function PencilStroke({
  points,
  width,
  color,
  opacity,
}: {
  points: AnnotationPoint[];
  width: number;
  color: string;
  opacity: number;
}) {
  return (
    <g opacity={opacity} pointerEvents="none" stroke="none" fill={color}>
      {pencilTexture(points, width).map((path, index) => (
        <path
          key={index}
          d={path}
          style={{ fill: color, stroke: "none" }}
          opacity={[0.3, 0.52, 0.76][index]}
        />
      ))}
    </g>
  );
});
