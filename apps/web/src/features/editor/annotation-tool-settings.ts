export type DrawingTool = "ink" | "highlight";

export type DrawingStyle = {
  color: string;
  width: number;
  opacity: number;
  recentColors: string[];
};

export type AnnotationToolPreferences = Record<DrawingTool, DrawingStyle>;

export const annotationPreferencesStorageKey =
  "coilora.annotation-tool-preferences.v1";

const colorPattern = /^#[0-9a-f]{6}$/i;

const defaults: AnnotationToolPreferences = {
  ink: {
    color: "#173f5f",
    width: 0.004,
    opacity: 1,
    recentColors: ["#173f5f", "#111111", "#d94f70"],
  },
  highlight: {
    color: "#fff36a",
    width: 0.03,
    opacity: 0.35,
    recentColors: ["#fff36a", "#ff9aa2", "#76c442"],
  },
};

export function defaultAnnotationToolPreferences(): AnnotationToolPreferences {
  return {
    ink: { ...defaults.ink, recentColors: [...defaults.ink.recentColors] },
    highlight: {
      ...defaults.highlight,
      recentColors: [...defaults.highlight.recentColors],
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeStyle(value: unknown, fallback: DrawingStyle): DrawingStyle {
  if (!isRecord(value)) return { ...fallback, recentColors: [...fallback.recentColors] };

  const color =
    typeof value.color === "string" && colorPattern.test(value.color)
      ? value.color.toLowerCase()
      : fallback.color;
  const width =
    typeof value.width === "number" &&
    Number.isFinite(value.width) &&
    value.width >= 0.0005 &&
    value.width <= 0.1
      ? value.width
      : fallback.width;
  const opacity =
    typeof value.opacity === "number" &&
    Number.isFinite(value.opacity) &&
    value.opacity >= 0 &&
    value.opacity <= 1
      ? value.opacity
      : fallback.opacity;
  const savedColors = Array.isArray(value.recentColors)
    ? value.recentColors.filter(
        (item): item is string =>
          typeof item === "string" && colorPattern.test(item),
      )
    : [];
  const recentColors = [
    ...new Set(
      [color, ...savedColors, ...fallback.recentColors].map((item) =>
        item.toLowerCase(),
      ),
    ),
  ].slice(0, 3);

  return { color, width, opacity, recentColors };
}

export function parseAnnotationToolPreferences(
  value: string | null,
): AnnotationToolPreferences {
  const fallback = defaultAnnotationToolPreferences();
  if (!value) return fallback;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return fallback;
    return {
      ink: normalizeStyle(parsed.ink, fallback.ink),
      highlight: normalizeStyle(parsed.highlight, fallback.highlight),
    };
  } catch {
    return fallback;
  }
}

export function selectDrawingColor(
  style: DrawingStyle,
  color: string,
): DrawingStyle {
  if (!colorPattern.test(color)) return style;
  const normalized = color.toLowerCase();
  return {
    ...style,
    color: normalized,
    recentColors: [
      normalized,
      ...style.recentColors.filter(
        (item) => item.toLowerCase() !== normalized,
      ),
    ].slice(0, 3),
  };
}
