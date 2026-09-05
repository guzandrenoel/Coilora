"use client";
import { useCallback, useState, type CSSProperties } from "react";
import {
  AnnotationCanvas,
  type EditorTool,
} from "@/features/editor/annotation-canvas";
import type { AnnotationHistoryEntry } from "@/lib/api/annotation-target-client";
import { PdfPageCanvas } from "./pdf-page-canvas";
import type { NotebookPdfPool } from "./notebook-pdf-pool";
import type { PageSize, TimelineRow } from "./notebook-timeline";
import styles from "./notebook-viewer.module.css";

export function NotebookPageSurface({
  row,
  notebookId,
  pool,
  tool,
  color,
  strokeWidth,
  opacity,
  visible,
  onSize,
  onBusy,
  annotationRefreshVersion,
  editorDisabled,
  onAnnotationCommit,
}: {
  row: TimelineRow;
  notebookId: string;
  pool: NotebookPdfPool;
  tool: EditorTool;
  color: string;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
  onSize: (key: string, size: PageSize) => void;
  onBusy: (key: string, busy: boolean) => void;
  annotationRefreshVersion: number;
  editorDisabled: boolean;
  onAnnotationCommit: (entry: AnnotationHistoryEntry) => void;
}) {
  const entry = row.entry;
  const [pdfReady, setPdfReady] = useState(false);
  const reportBusy = useCallback(
    (busy: boolean) => onBusy(entry.key, busy),
    [entry.key, onBusy],
  );
  if (entry.kind === "document") return null;
  const title =
    entry.kind === "note"
      ? entry.page.title
      : `${entry.document.title} · Page ${entry.pageNumber}`;
  return (
    <article
      className={styles.pageRow}
      style={{ top: row.top, height: row.height }}
      aria-label={title}
      data-page-key={entry.key}
    >
      <div className={styles.pageLabel} style={{ width: row.width }}>
        {title}
      </div>
      <div
        className={styles.paper}
        data-paper-style={
          entry.kind === "note" ? entry.page.paper_style : "pdf"
        }
        style={
          {
            width: row.width,
            height: row.paperHeight,
            "--paper-scale": row.width / 595,
          } as CSSProperties
        }
      >
        {entry.kind === "pdf" && visible ? (
          <PdfPageCanvas
            pool={pool}
            documentId={entry.document.id}
            pageNumber={entry.pageNumber}
            width={row.width}
            onSize={(size) => onSize(entry.key, size)}
            onReady={() => setPdfReady(true)}
          />
        ) : null}
        {entry.kind === "note" || pdfReady ? (
          <AnnotationCanvas
            targetKey={entry.key}
            pageHeight={row.paperHeight}
            notebookId={entry.kind === "note" ? notebookId : undefined}
            pageId={entry.kind === "note" ? entry.page.id : undefined}
            documentId={entry.kind === "pdf" ? entry.document.id : undefined}
            documentPageNumber={
              entry.kind === "pdf" ? entry.pageNumber : undefined
            }
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            opacity={opacity}
            disabled={editorDisabled}
            refreshVersion={annotationRefreshVersion}
            onBusyChange={reportBusy}
            onCommit={onAnnotationCommit}
          />
        ) : null}
      </div>
    </article>
  );
}
