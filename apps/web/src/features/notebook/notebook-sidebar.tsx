"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookmarkIcon } from "@/components/ui/icons";
import {
  getAnnotationBounds,
  pointsToSvgPath,
} from "@/features/editor/annotation-geometry";
import { getPageAnnotations } from "@/lib/api/annotations-client";
import { getDocumentPageAnnotations } from "@/lib/api/document-annotations-client";
import type { NotebookPage, PageAnnotation } from "@/lib/api/types";
import type { NotebookPdfPool } from "./notebook-pdf-pool";
import {
  rememberExpandedDocument,
  type TimelineEntry,
} from "./notebook-timeline";
import { PdfPageCanvas } from "./pdf-page-canvas";
import { NotebookPageMenu } from "./notebook-page-menu";
import styles from "./notebook-viewer.module.css";

type Props = {
  notebookId: string;
  open: boolean;
  entries: TimelineEntry[];
  activeKey?: string;
  pool: NotebookPdfPool;
  pdfBookmarks: Record<string, number[]>;
  bookmarkBusy: Set<string>;
  onJump: (key: string) => void;
  onBookmark: (entry: TimelineEntry) => void;
  onEnsureBookmarks: (documentId: string) => Promise<void>;
  onRename: (page: NotebookPage) => void;
  onDelete: (page: NotebookPage) => void;
  busyPages: Set<string>;
  onAdd: () => void;
  annotationVersions: Record<string, number>;
};

type PageEntry = Exclude<TimelineEntry, { kind: "document" }>;
export function NotebookSidebar(props: Props) {
  const { entries, activeKey, pdfBookmarks, onEnsureBookmarks } = props;
  const [filter, setFilter] = useState<"all" | "bookmarks">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [collapsedBookmarks, setCollapsedBookmarks] = useState<Set<string>>(
    new Set(),
  );
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const groups = useMemo(() => {
    const standalone: TimelineEntry[] = [];
    const documents: {
      header: Extract<TimelineEntry, { kind: "document" }>;
      pages: TimelineEntry[];
    }[] = [];
    for (const entry of entries) {
      if (entry.kind === "document")
        documents.push({ header: entry, pages: [] });
      else if (documents.length)
        documents[documents.length - 1].pages.push(entry);
      else standalone.push(entry);
    }
    return { standalone, documents };
  }, [entries]);
  const activeDocument = entries.find((entry) => entry.key === activeKey);
  const activeDocumentId =
    activeDocument?.kind === "note"
      ? activeDocument.page.document_id
      : activeDocument?.document.id;
  const activeIsPdf = groups.documents.some(
    (group) =>
      group.header.document.id === activeDocumentId &&
      group.header.document.source_type === "pdf" &&
      group.header.document.status === "uploaded",
  );
  useEffect(() => {
    if (activeDocumentId) {
      if (activeIsPdf) {
        void onEnsureBookmarks(activeDocumentId);
        // Reaching a PDF is a one-way disclosure signal. Scrolling away must
        // not undo the open state the user was just working with.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExpanded((current) =>
          rememberExpandedDocument(current, activeDocumentId),
        );
      }
    }
  }, [activeDocumentId, activeIsPdf, onEnsureBookmarks]);
  const marked = (entry: TimelineEntry) =>
    entry.kind === "note"
      ? entry.page.bookmarked
      : entry.kind === "document"
        ? entry.document.bookmarked
        : (pdfBookmarks[entry.document.id] ?? []).includes(entry.pageNumber);
  async function showBookmarks() {
    setFilter("bookmarks");
    setCollapsedBookmarks(new Set());
    setLoadingBookmarks(true);
    const docs = groups.documents.filter(
      (group) =>
        group.header.document.source_type === "pdf" &&
        group.header.document.status === "uploaded",
    );
    let index = 0;
    await Promise.all(
      Array.from({ length: Math.min(3, docs.length) }, async () => {
        while (index < docs.length) {
          const doc = docs[index++];
          await onEnsureBookmarks(doc.header.document.id);
        }
      }),
    );
    setLoadingBookmarks(false);
  }
  return (
    <aside
      className={styles.sidebar}
      id="notebook-contents"
      hidden={!props.open}
      aria-label="Notebook contents"
    >
      <h2>Notebook contents</h2>
      <div className={styles.filters}>
        <button
          type="button"
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          type="button"
          aria-pressed={filter === "bookmarks"}
          aria-label="Show bookmarked pages and files"
          title="Show bookmarked pages and files"
          onClick={() => void showBookmarks()}
        >
          <BookmarkIcon />
        </button>
      </div>
      <div className={styles.sidebarScroll}>
        {loadingBookmarks ? (
          <p role="status">Loading page bookmarks...</p>
        ) : null}
        <ThumbnailGrid
          {...props}
          items={groups.standalone.filter(
            (entry) => filter === "all" || marked(entry),
          )}
          marked={marked}
        />
        {groups.documents.map((group) => {
          const { header } = group;
          const id = header.document.id;
          const items = group.pages.filter(
            (entry) => filter === "all" || marked(entry),
          );
          if (
            filter === "bookmarks" &&
            !header.document.bookmarked &&
            !items.length
          )
            return null;
          const open =
            filter === "bookmarks"
              ? !collapsedBookmarks.has(id)
              : (expanded[id] ?? false);
          return (
            <section className={styles.documentGroup} key={id}>
              <div className={styles.groupHeader}>
                <button
                  type="button"
                  className={styles.expand}
                  aria-expanded={open}
                  aria-controls={`group-${id}`}
                  aria-label={`${open ? "Collapse" : "Expand"} ${header.document.title}`}
                  onClick={() => {
                    if (filter === "bookmarks")
                      setCollapsedBookmarks((current) => {
                        const next = new Set(current);
                        if (open) next.add(id);
                        else next.delete(id);
                        return next;
                      });
                    else
                      setExpanded((current) => ({ ...current, [id]: !open }));
                    if (
                      !open &&
                      header.document.source_type === "pdf" &&
                      header.document.status === "uploaded"
                    )
                      void onEnsureBookmarks(id);
                  }}
                >
                  {open ? "▾" : "▸"}
                </button>
                <button
                  type="button"
                  className={styles.groupTitle}
                  onClick={() => props.onJump(header.key)}
                  title={header.document.title}
                >
                  {header.document.title}
                  <small>
                    {header.document.page_count
                      ? `${header.document.page_count} PDF pages`
                      : header.document.source_type.toUpperCase()}
                  </small>
                </button>
                <button
                  type="button"
                  className={styles.ribbon}
                  aria-pressed={header.document.bookmarked}
                  disabled={props.bookmarkBusy.has(header.key)}
                  aria-label={`${header.document.bookmarked ? "Remove" : "Add"} document bookmark for ${header.document.title}`}
                  onClick={() => props.onBookmark(header)}
                >
                  <BookmarkIcon />
                </button>
              </div>
              <div id={`group-${id}`} hidden={!open}>
                {open ? (
                  <ThumbnailGrid {...props} items={items} marked={marked} />
                ) : null}
              </div>
            </section>
          );
        })}
        {filter === "bookmarks" &&
        !loadingBookmarks &&
        !entries.some(marked) ? (
          <p className={styles.empty}>
            No bookmarks yet. Use a ribbon to save your place.
          </p>
        ) : null}
      </div>
      <button type="button" className={styles.addPage} onClick={props.onAdd}>
        + Add notebook page
      </button>
    </aside>
  );
}

function ThumbnailGrid({
  items,
  marked,
  activeKey,
  pool,
  onJump,
  onBookmark,
  bookmarkBusy,
  onRename,
  onDelete,
  busyPages,
  notebookId,
  annotationVersions,
}: Props & {
  items: TimelineEntry[];
  marked: (entry: TimelineEntry) => boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const rowHeight = 202;
  const height = Math.min(424, Math.ceil(items.length / 2) * rowHeight);
  const start = Math.max(0, Math.floor(top / rowHeight) - 1) * 2;
  const end = Math.min(
    items.length,
    (Math.ceil((top + height) / rowHeight) + 1) * 2,
  );
  useEffect(() => {
    const index = items.findIndex((entry) => entry.key === activeKey);
    const element = ref.current;
    if (index < 0 || !element) return;
    const target = Math.floor(index / 2) * rowHeight;
    if (
      target < element.scrollTop ||
      target + rowHeight > element.scrollTop + element.clientHeight
    )
      element.scrollTop = target;
  }, [activeKey, items]);
  if (!items.length) return null;
  return (
    <div
      ref={ref}
      className={styles.thumbnailScroll}
      style={{ height }}
      onScroll={(event) => setTop(event.currentTarget.scrollTop)}
      aria-label="Page previews"
    >
      <div
        className={styles.thumbnailTrack}
        style={{ height: Math.ceil(items.length / 2) * rowHeight }}
      >
        {items.slice(start, end).map((entry, offset) => {
          if (entry.kind === "document") return null;
          const index = start + offset;
          const title =
            entry.kind === "note"
              ? entry.page.title
              : `Page ${entry.pageNumber}`;
          return (
            <div
              className={styles.thumbnailCard}
              key={entry.key}
              style={{
                top: Math.floor(index / 2) * rowHeight,
                left: index % 2 ? "50%" : 0,
              }}
            >
              <button
                type="button"
                className={styles.thumbnailLink}
                aria-current={activeKey === entry.key ? "page" : undefined}
                aria-label={`Go to ${title}`}
                onClick={() => onJump(entry.key)}
              >
                <span
                  className={styles.paperSample}
                  data-paper-style={
                    entry.kind === "note" ? entry.page.paper_style : "pdf"
                  }
                >
                  {entry.kind === "pdf" ? (
                    <VisibleThumbnail pool={pool} entry={entry} />
                  ) : null}
                  <ThumbnailAnnotations
                    notebookId={notebookId}
                    entry={entry}
                    refreshVersion={annotationVersions[entry.key] ?? 0}
                  />
                </span>
              </button>
              <button
                type="button"
                className={styles.thumbnailRibbon}
                aria-pressed={marked(entry)}
                disabled={bookmarkBusy.has(entry.key)}
                aria-label={`${marked(entry) ? "Remove" : "Add"} bookmark for ${title}`}
                onClick={() => onBookmark(entry)}
              >
                <BookmarkIcon />
              </button>
              <div className={styles.thumbnailCaption}>
                <button
                  type="button"
                  className={styles.thumbnailTitle}
                  title={title}
                  onClick={() => onJump(entry.key)}
                >
                  {title}
                </button>
                {entry.kind === "note" ? (
                  <NotebookPageMenu
                    page={entry.page}
                    onRename={onRename}
                    onDelete={onDelete}
                    deleteBlocked={
                      busyPages.has(entry.key) || bookmarkBusy.has(entry.key)
                        ? "Finish saving this page before deleting it."
                        : undefined
                    }
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThumbnailAnnotations({
  notebookId,
  entry,
  refreshVersion,
}: {
  notebookId: string;
  entry: PageEntry;
  refreshVersion: number;
}) {
  const [annotations, setAnnotations] = useState<PageAnnotation[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const loaded: PageAnnotation[] = [];
      let cursor: number | null = 0;

      try {
        while (cursor !== null && !cancelled) {
          const result: {
            items: PageAnnotation[];
            nextPage: number | null;
          } =
            entry.kind === "note"
              ? await getPageAnnotations(notebookId, entry.page.id, cursor)
              : await getDocumentPageAnnotations(
                  entry.document.id,
                  entry.pageNumber,
                  cursor,
                );
          loaded.push(...result.items);
          cursor = result.nextPage;
        }
        if (!cancelled) {
          setAnnotations(
            loaded.sort((left, right) => left.z_index - right.z_index),
          );
        }
      } catch {
        if (!cancelled) setAnnotations([]);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [entry, notebookId, refreshVersion]);

  if (!annotations.length) return null;

  return (
    <svg
      className={styles.thumbnailAnnotations}
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {annotations.map((annotation) => {
        if (annotation.kind === "text") {
          const bounds = getAnnotationBounds(annotation.points);
          return (
            <foreignObject
              key={annotation.id}
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
            >
              <div
                className={styles.thumbnailTextAnnotation}
                style={{
                  color: annotation.color,
                  fontSize: `${annotation.font_size ?? 0.025}px`,
                  opacity: annotation.opacity,
                }}
              >
                {annotation.text_content}
              </div>
            </foreignObject>
          );
        }
        return (
          <path
            key={annotation.id}
            d={pointsToSvgPath(annotation.points)}
            stroke={annotation.color}
            strokeWidth={annotation.width}
            opacity={annotation.opacity}
          />
        );
      })}
    </svg>
  );
}

function VisibleThumbnail({
  pool,
  entry,
}: {
  pool: NotebookPdfPool;
  entry: Extract<TimelineEntry, { kind: "pdf" }>;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (items) => setVisible(items.some((item) => item.isIntersecting)),
      { rootMargin: "100px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <span className={styles.thumbnailCanvas} ref={ref}>
      {visible ? (
        <PdfPageCanvas
          pool={pool}
          documentId={entry.document.id}
          pageNumber={entry.pageNumber}
          width={116}
          thumbnail
        />
      ) : null}
    </span>
  );
}
