import type { AnnotationPoint } from "@/lib/api/types";

type PageRectangle = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function getNormalizedPoint(
  clientX: number,
  clientY: number,
  rectangle: PageRectangle,
): AnnotationPoint {
  if (rectangle.width <= 0 || rectangle.height <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: clamp(
      (clientX - rectangle.left) / rectangle.width,
    ),
    y: clamp(
      (clientY - rectangle.top) / rectangle.height,
    ),
  };
}

export function shouldAppendPoint(
  points: AnnotationPoint[],
  nextPoint: AnnotationPoint,
  minimumDistance = 0.0015,
) {
  const previous = points.at(-1);

  if (!previous) return true;

  return (
    Math.hypot(
      nextPoint.x - previous.x,
      nextPoint.y - previous.y,
    ) >= minimumDistance
  );
}

export function pointsToSvgPath(
  points: AnnotationPoint[],
) {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
    )
    .join(" ");
}