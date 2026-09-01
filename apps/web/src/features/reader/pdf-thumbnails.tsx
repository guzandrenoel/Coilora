"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

import { getThumbnailRange, THUMBNAIL_ROW_HEIGHT } from "./pdf-layout";
import styles from "./pdf-reader.module.css";
import type { NotebookPage } from "@/lib/api/types";

export function PdfThumbnails({
  pdf,
  selectedPage,
  onSelect,
  onClose,
  onToggleBookmark,
  onAddNote,
  bookmarkedPages,
  attachedNotes,
  notebookId,
}: {
  pdf: PDFDocumentProxy;
  selectedPage: number;
  onSelect: (page: number) => void;
  onClose: () => void;
  onToggleBookmark: (page: number) => void;
  onAddNote: () => void;
  bookmarkedPages: Set<number>;
  attachedNotes: NotebookPage[];
  notebookId: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({
    start: 0,
    end: Math.min(6, pdf.numPages),
  });

  function updateRange() {
    const list = listRef.current;
    if (!list) return;
    const next = getThumbnailRange(
      list.scrollTop,
      list.clientHeight,
      pdf.numPages,
    );
    setRange((current) =>
      current.start === next.start && current.end === next.end ? current : next,
    );
  }

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => {
      const next = getThumbnailRange(
        list.scrollTop,
        list.clientHeight,
        pdf.numPages,
      );
      setRange((current) =>
        current.start === next.start && current.end === next.end
          ? current
          : next,
      );
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [pdf]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const top = (selectedPage - 1) * THUMBNAIL_ROW_HEIGHT;
    if (
      top < list.scrollTop ||
      top + THUMBNAIL_ROW_HEIGHT > list.scrollTop + list.clientHeight
    ) {
      list.scrollTo({
        top: Math.max(0, top - (list.clientHeight - THUMBNAIL_ROW_HEIGHT) / 2),
        behavior: "instant",
      });
    }
  }, [selectedPage]);

  return (
    <aside
      id="pdf-pages"
      className={styles.sidebar}
      aria-label="Page thumbnails"
    >
      <div className={styles.sidebarHeader}>
        <h2>
          Pages <span>{pdf.numPages}</span>
        </h2>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Hide pages"
          title="Hide pages"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div
        className={styles.thumbnailList}
        ref={listRef}
        onScroll={updateRange}
        tabIndex={0}
        aria-label="Scroll pages"
      >
        <ol
          className={styles.thumbnailTrack}
          style={{ height: pdf.numPages * THUMBNAIL_ROW_HEIGHT }}
        >
          {Array.from(
            { length: range.end - range.start },
            (_, offset) => range.start + offset + 1,
          ).map((page) => (
            <li
              key={page}
              className={styles.thumbnailRow}
              style={{ top: (page - 1) * THUMBNAIL_ROW_HEIGHT }}
            >
              <button
                type="button"
                className={styles.thumbnailButton}
                aria-label={`Go to page ${page}`}
                aria-current={selectedPage === page ? "page" : undefined}
                onClick={() => onSelect(page)}
              >
                <Thumbnail pdf={pdf} pageNumber={page} />
                <span className={styles.thumbnailNumber}>{page}</span>
              </button>
              <button
                type="button"
                className={styles.thumbnailBookmark}
                aria-label={`${
                  bookmarkedPages.has(page) ? "Remove" : "Add"
                } bookmark for PDF page ${page}`}
                aria-pressed={bookmarkedPages.has(page)}
                onClick={() => onToggleBookmark(page)}
              >
                {bookmarkedPages.has(page) ? "★" : "☆"}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.documentNotes}>
        {attachedNotes.length > 0 ? <h3>Inserted notes</h3> : null}
        {attachedNotes
          .slice()
          .sort(
            (first, second) =>
              (first.after_document_page_number ?? 0) -
              (second.after_document_page_number ?? 0),
          )
          .map((note) => (
            <Link
              key={note.id}
              href={`/library/notebooks/${encodeURIComponent(
                notebookId,
              )}/pages/${encodeURIComponent(note.id)}`}
            >
              <span>{note.title}</span>
              <small>After PDF page {note.after_document_page_number}</small>
            </Link>
          ))}
        <button type="button" onClick={onAddNote}>
          + Add note page
        </button>
      </div>
    </aside>
  );
}

function Thumbnail({
  pdf,
  pageNumber,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    let task: RenderTask | undefined;
    const host = hostRef.current;
    const canvas = document.createElement("canvas");

    async function render() {
      const page = await pdf.getPage(pageNumber);
      try {
        if (cancelled || !host) return;
        const base = page.getViewport({ scale: 1 });
        if (
          ![base.width, base.height].every(
            (size) => Number.isFinite(size) && size > 0,
          )
        ) {
          throw new Error("Unsupported page dimensions.");
        }
        const viewport = page.getViewport({
          scale: Math.min(128 / base.width, 156 / base.height),
        });
        canvas.width = Math.max(1, Math.ceil(viewport.width * 1.5));
        canvas.height = Math.max(1, Math.ceil(viewport.height * 1.5));
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.setAttribute("aria-hidden", "true");
        task = page.render({
          canvas,
          viewport,
          transform: [1.5, 0, 0, 1.5, 0, 0],
        });
        await task.promise;
        if (cancelled) return;
        host.replaceChildren(canvas);
        setStatus("ready");
      } finally {
        // PDF.js defers cleanup while another view is rendering the same page.
        page.cleanup();
      }
    }

    void render().catch(() => {
      if (!cancelled) setStatus("error");
    });
    return () => {
      cancelled = true;
      task?.cancel();
      host?.replaceChildren();
    };
  }, [pdf, pageNumber]);

  return (
    <span className={styles.thumbnailPreview}>
      <span ref={hostRef} />
      {status !== "ready" ? (
        <span className={styles.thumbnailPlaceholder}>
          {status === "error" ? "Preview unavailable" : "Loading…"}
        </span>
      ) : null}
    </span>
  );
}
