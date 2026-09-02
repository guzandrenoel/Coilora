import type { NotebookPage } from "../../lib/api/types";
import type { SavedDocument } from "../../lib/api/documents-client";

export type TimelineEntry =
  | { key: string; kind: "note"; page: NotebookPage }
  | { key: string; kind: "document"; document: SavedDocument }
  | { key: string; kind: "pdf"; document: SavedDocument; pageNumber: number };
export type PageSize = { width: number; height: number };
export type TimelineRow = {
  entry: TimelineEntry;
  top: number;
  height: number;
  width: number;
  paperHeight: number;
};
export type NotebookZoom = "width" | "page" | number;
export const noteKey = (id: string) => `note:${id}`;
export const documentKey = (id: string) => `document:${id}`;
export const pdfKey = (id: string, page: number) => `pdf:${id}:${page}`;

export function buildTimeline(
  pages: NotebookPage[],
  documents: SavedDocument[],
): TimelineEntry[] {
  const result: TimelineEntry[] = [];
  const sortedNotes = [...pages].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
  const documentIds = new Set(documents.map((doc) => doc.id));
  const addNote = (page: NotebookPage) =>
    result.push({ kind: "note", key: noteKey(page.id), page });
  // Retain notes with missing sources instead of silently hiding student work.
  sortedNotes
    .filter((page) => !page.document_id || !documentIds.has(page.document_id))
    .forEach(addNote);
  for (const doc of [...documents].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  )) {
    result.push({ kind: "document", key: documentKey(doc.id), document: doc });
    const notes = sortedNotes.filter((page) => page.document_id === doc.id);
    const count =
      doc.source_type === "pdf" && doc.status === "uploaded"
        ? Math.max(1, Math.min(5000, doc.page_count ?? 1))
        : 0;
    notes
      .filter((page) => (page.after_document_page_number ?? 0) === 0)
      .forEach(addNote);
    for (let pageNumber = 1; pageNumber <= count; pageNumber++) {
      result.push({
        kind: "pdf",
        key: pdfKey(doc.id, pageNumber),
        document: doc,
        pageNumber,
      });
      notes
        .filter((page) => page.after_document_page_number === pageNumber)
        .forEach(addNote);
    }
    notes
      .filter((page) => (page.after_document_page_number ?? 0) > count)
      .forEach(addNote);
  }
  return result;
}

export function layoutTimeline(
  entries: TimelineEntry[],
  sizes: Record<string, PageSize>,
  viewport: PageSize,
  zoom: NotebookZoom,
): TimelineRow[] {
  let top = 16;
  return entries.map((entry) => {
    if (entry.kind === "document") {
      const height =
        entry.document.source_type === "pdf" &&
        entry.document.status === "uploaded"
          ? 88
          : 160;
      const row = {
        entry,
        top,
        height,
        width: Math.max(1, viewport.width - 32),
        paperHeight: 0,
      };
      top += height;
      return row;
    }
    const size =
      sizes[entry.key] ??
      (entry.kind === "note"
        ? { width: 595, height: 842 }
        : { width: 612, height: 792 });
    const scale =
      typeof zoom === "number"
        ? zoom
        : Math.max(
            0.01,
            Math.min(
              2,
              Math.max(1, viewport.width - 48) / size.width,
              zoom === "page"
                ? Math.max(1, viewport.height - 100) / size.height
                : Infinity,
            ),
          );
    const width = size.width * scale;
    const paperHeight = size.height * scale;
    const row = { entry, top, height: paperHeight + 64, paperHeight, width };
    top += row.height;
    return row;
  });
}

export function rowAtOffset(rows: TimelineRow[], offset: number): number {
  if (!rows.length) return -1;
  let low = 0,
    high = rows.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (rows[mid].top + rows[mid].height <= offset) low = mid + 1;
    else high = mid;
  }
  return low;
}
export function timelineWidth(rows: TimelineRow[], viewportWidth: number) {
  return rows.reduce(
    (width, row) =>
      row.entry.kind === "document" ? width : Math.max(width, row.width + 48),
    viewportWidth,
  );
}
export function visibleRows(
  rows: TimelineRow[],
  top: number,
  height: number,
  buffer = 400,
) {
  if (!rows.length) return { start: 0, end: 0 };
  return {
    start: rowAtOffset(rows, Math.max(0, top - buffer)),
    end: Math.min(rows.length, rowAtOffset(rows, top + height + buffer) + 1),
  };
}
export function anchoredScroll(
  previous: TimelineRow[],
  next: TimelineRow[],
  scrollTop: number,
): number {
  const old = previous[rowAtOffset(previous, scrollTop)];
  if (!old) return scrollTop;
  const row = next.find((item) => item.entry.key === old.entry.key);
  if (!row) return scrollTop;
  return Math.max(
    0,
    row.top + ((scrollTop - old.top) / old.height) * row.height,
  );
}
