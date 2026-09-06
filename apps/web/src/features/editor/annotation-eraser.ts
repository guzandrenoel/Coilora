import type { AnnotationPoint } from "@/lib/api/types";

// Clip line segments against a circular eraser in page pixels, including sparse strokes.
export function eraseAtPoint(
  points: AnnotationPoint[],
  center: AnnotationPoint,
  radius: number,
  width: number,
  height: number,
): AnnotationPoint[][] {
  const pieces: AnnotationPoint[][] = [];
  let piece: AnnotationPoint[] = [];
  const flush = () => {
    if (piece.length >= 2) pieces.push(piece);
    piece = [];
  };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = (b.x - a.x) * width;
    const dy = (b.y - a.y) * height;
    const x = (a.x - center.x) * width;
    const y = (a.y - center.y) * height;
    const length = dx * dx + dy * dy;
    const dot = x * dx + y * dy;
    const c = x * x + y * y - radius * radius;
    const discriminant = dot * dot - length * c;
    let start = 1;
    let end = 0;
    if (length > 0 && discriminant > 0) {
      start = Math.max(0, (-dot - Math.sqrt(discriminant)) / length);
      end = Math.min(1, (-dot + Math.sqrt(discriminant)) / length);
    } else if (length === 0 && c < 0) {
      start = 0;
      end = 1;
    }
    const at = (t: number): AnnotationPoint => ({
      ...a,
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    });
    if (start >= end) {
      if (!piece.length) piece.push(a);
      piece.push(b);
    } else {
      if (start > 0) {
        if (!piece.length) piece.push(a);
        piece.push(at(start));
      }
      flush();
      if (end < 1) piece = [at(end), b];
    }
  }
  flush();
  return pieces;
}
