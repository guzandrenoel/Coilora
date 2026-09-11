export const textFontFamilies = [
  "modern",
  "classic",
  "rounded",
  "typewriter",
  "handwritten",
] as const;
export type TextFontFamily = (typeof textFontFamilies)[number];

export const textAlignments = ["left", "center", "right"] as const;
export type TextAlignment = (typeof textAlignments)[number];

export type TextFormat = {
  fontFamily: TextFontFamily;
  bold: boolean;
  italic: boolean;
  textAlign: TextAlignment;
};

export const defaultTextFormat: TextFormat = {
  fontFamily: "modern",
  bold: false,
  italic: false,
  textAlign: "left",
};

export const textFormatStorageKey = "coilora.text-format.v1";

export function parseTextFormat(value: string | null): TextFormat {
  if (!value) return defaultTextFormat;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return defaultTextFormat;
    const item = parsed as Record<string, unknown>;
    return {
      fontFamily: textFontFamilies.includes(item.fontFamily as TextFontFamily)
        ? (item.fontFamily as TextFontFamily)
        : defaultTextFormat.fontFamily,
      bold: typeof item.bold === "boolean" ? item.bold : false,
      italic: typeof item.italic === "boolean" ? item.italic : false,
      textAlign: textAlignments.includes(item.textAlign as TextAlignment)
        ? (item.textAlign as TextAlignment)
        : defaultTextFormat.textAlign,
    };
  } catch {
    return defaultTextFormat;
  }
}

export function textFontStack(family: TextFontFamily) {
  if (family === "classic") return 'Georgia, "Times New Roman", serif';
  if (family === "rounded") return '"Trebuchet MS", Arial, sans-serif';
  if (family === "typewriter") return '"Courier New", Courier, monospace';
  if (family === "handwritten") return '"Segoe Print", "Bradley Hand", cursive';
  return 'Arial, "Helvetica Neue", sans-serif';
}
