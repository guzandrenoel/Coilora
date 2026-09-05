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
    x: clamp((clientX - rectangle.left) / rectangle.width),
    y: clamp((clientY - rectangle.top) / rectangle.height),
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
    Math.hypot(nextPoint.x - previous.x, nextPoint.y - previous.y) >=
    minimumDistance
  );
}

export function pointsToSvgPath(points: AnnotationPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function getAnnotationBounds(points: AnnotationPoint[], padding = 0) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = clamp(Math.min(...xs) - padding);
  const top = clamp(Math.min(...ys) - padding);
  const right = clamp(Math.max(...xs) + padding);
  const bottom = clamp(Math.max(...ys) + padding);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function translateAnnotationPoints(
  points: AnnotationPoint[],
  deltaX: number,
  deltaY: number,
) {
  const bounds = getAnnotationBounds(points);
  const translatedX = Math.min(
    1 - bounds.x - bounds.width,
    Math.max(-bounds.x, deltaX),
  );
  const translatedY = Math.min(
    1 - bounds.y - bounds.height,
    Math.max(-bounds.y, deltaY),
  );

  return points.map((point) => ({
    x: point.x + translatedX,
    y: point.y + translatedY,
  }));
}
