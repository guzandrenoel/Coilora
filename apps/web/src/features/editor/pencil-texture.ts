import type { AnnotationPoint } from "@/lib/api/types";

const cache = new WeakMap<AnnotationPoint[], Map<number, string[]>>();
const decimal = (value: number) => Number(value.toFixed(6));

// Resample by distance so graphite does not become denser on slow pointer events.
export function pencilTexture(
  points: AnnotationPoint[],
  width: number,
): string[] {
  const cached = cache.get(points)?.get(width);
  if (cached) return cached;
  const paths = ["", "", ""];
  if (points.length < 2 || width <= 0) return paths;
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
  }
  const spacing = Math.max(width * 0.22, length / 1800);
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const segment = Math.hypot(dx, dy);
    if (!segment) continue;
    for (; carry <= segment; carry += spacing) {
      const x = a.x + (dx * carry) / segment;
      const y = a.y + (dy * carry) / segment;
      let seed =
        (Math.round(x * 1000000) ^
          Math.imul(Math.round(y * 1000000), 374761393)) >>>
        0;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let grain = 0; grain < 4; grain++) {
        const offset = (random() - 0.5) * width * 0.85;
        const along = (random() - 0.5) * spacing;
        const cx = x + (-dy * offset + dx * along) / segment;
        const cy = y + (dx * offset + dy * along) / segment;
        const radius = width * (0.065 + random() * 0.14);
        const layer = Math.min(2, Math.floor(random() * 3));
        let path = "";
        for (let corner = 0; corner < 5; corner++) {
          const angle = (corner * Math.PI * 2) / 5;
          const r = radius * (0.65 + random() * 0.7);
          path += `${corner ? "L" : "M"}${decimal(cx + Math.cos(angle) * r)} ${decimal(cy + Math.sin(angle) * r)}`;
        }
        paths[layer] += path + "Z";
      }
    }
    carry -= segment;
  }
  const widths = cache.get(points) ?? new Map<number, string[]>();
  widths.set(width, paths);
  cache.set(points, widths);
  return paths;
}
