export type PdfZoom = "fit" | "page" | number;

export function getPageScale(
  zoom: PdfZoom,
  pageWidth: number,
  pageHeight: number,
  availableWidth: number,
  availableHeight: number,
) {
  if (
    ![pageWidth, pageHeight].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  ) {
    throw new Error("Unsupported page dimensions.");
  }
  if (typeof zoom === "number") {
    if (!Number.isFinite(zoom) || zoom < 0.5 || zoom > 3) {
      throw new Error("Unsupported zoom level.");
    }
    return zoom;
  }
  const widthScale = Math.max(1, availableWidth - 48) / pageWidth;
  const heightScale = Math.max(1, availableHeight - 48) / pageHeight;
  return Math.min(3, widthScale, zoom === "page" ? heightScale : Infinity);
}

export const THUMBNAIL_ROW_HEIGHT = 204;

export function getThumbnailRange(
  scrollTop: number,
  height: number,
  total: number,
) {
  const start = Math.max(0, Math.floor(scrollTop / THUMBNAIL_ROW_HEIGHT) - 2);
  const end = Math.min(
    total,
    Math.ceil((scrollTop + height) / THUMBNAIL_ROW_HEIGHT) + 2,
  );
  return { start: Math.min(start, total), end };
}
