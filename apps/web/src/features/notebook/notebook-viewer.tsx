"use client";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BookmarkIcon, HandIcon } from "@/components/ui/icons";
import { PagePanelToggle } from "@/features/editor/page-panel-toggle";
import type { EditorTool } from "@/features/editor/annotation-canvas";
import {
  getNotebookPages,
  updateNotebookPage,
} from "@/lib/api/notebook-pages-client";
import {
  getSavedDocuments,
  setSavedDocumentBookmark,
  type SavedDocument,
} from "@/lib/api/documents-client";
import {
  getDocumentBookmarks,
  setDocumentBookmark,
} from "@/lib/api/document-annotations-client";
import { getNotebooks } from "@/lib/api/library-client";
import type { NotebookPage } from "@/lib/api/types";
import {
  anchoredScroll,
  buildTimeline,
  layoutTimeline,
  noteKey,
  rowAtOffset,
  timelineWidth,
  visibleRows,
  type NotebookZoom,
  type PageSize,
  type TimelineEntry,
  type TimelineRow,
} from "./notebook-timeline";
import {
  createNotebookPdfPool,
  type NotebookPdfPool,
} from "./notebook-pdf-pool";
import { NotebookPageSurface } from "./notebook-page-surface";
import { NotebookSidebar } from "./notebook-sidebar";
import { NotebookPageDialog, type PageDialog } from "./notebook-page-dialog";
import styles from "./notebook-viewer.module.css";

const colors = ["#173f5f", "#d94f70", "#e6b800", "#2b8a6e", "#7b61c9"];

export function NotebookViewer({
  notebookId,
  initialKey,
}: {
  notebookId: string;
  initialKey: string;
}) {
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [title, setTitle] = useState("Notebook");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pool, setPool] = useState<NotebookPdfPool | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tool, setTool] = useState<EditorTool>("pan");
  const [color, setColor] = useState(colors[0]);
  const [zoom, setZoom] = useState<NotebookZoom>("page");
  const [sizes, setSizes] = useState<Record<string, PageSize>>({});
  const [viewport, setViewport] = useState({ width: 900, height: 800 });
  const [scrollTop, setScrollTop] = useState(0);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<PageDialog | null>(null);
  const [pdfBookmarks, setPdfBookmarks] = useState<Record<string, number[]>>(
    {},
  );
  const [bookmarkBusy, setBookmarkBusy] = useState<Set<string>>(new Set());
  const savingBookmarks = useRef(new Set<string>());
  const viewportRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const previousRows = useRef<TimelineRow[]>([]);
  const pendingJump = useRef<string | null>(initialKey);
  const [jumpVersion, setJumpVersion] = useState(0);
  const bookmarkLoads = useRef(new Map<string, Promise<void>>());
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [notes, docs, notebooks] = await Promise.all([
          (async () => {
            const items: NotebookPage[] = [];
            let cursor: number | null = 0;
            while (cursor !== null && !cancelled) {
              const result = await getNotebookPages(notebookId, cursor);
              items.push(...result.items);
              cursor = result.nextPage;
            }
            return items;
          })(),
          (async () => {
            const items: SavedDocument[] = [];
            let cursor: number | null = 0;
            while (cursor !== null && !cancelled) {
              const result = await getSavedDocuments(notebookId, cursor);
              items.push(...result.items);
              cursor = result.nextPage;
            }
            return items;
          })(),
          getNotebooks(),
        ]);
        if (cancelled) return;
        setPages(notes);
        setDocuments(docs);
        setTitle(
          notebooks.find((item) => item.id === notebookId)?.title ?? "Notebook",
        );
        setError(null);
        setLoaded(true);
        let hash = "";
        try {
          hash = decodeURIComponent(window.location.hash.slice(1));
        } catch {
          // Ignore malformed links; the route still identifies a valid page.
        }
        pendingJump.current = /^(note|pdf|document):/.test(hash)
          ? hash
          : initialKey;
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Notebook contents could not be loaded.",
          );
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [notebookId, initialKey, attempt]);

  const onCount = useCallback((id: string, count: number) => {
    setDocuments((current) =>
      current.some((doc) => doc.id === id && doc.page_count !== count)
        ? current.map((doc) =>
            doc.id === id ? { ...doc, page_count: count } : doc,
          )
        : current,
    );
  }, []);
  useEffect(() => {
    let cancelled = false;
    const resource = createNotebookPdfPool(notebookId, onCount);
    Promise.resolve().then(() => {
      if (!cancelled) setPool(resource.pool);
    });
    return () => {
      cancelled = true;
      resource.dispose();
    };
  }, [notebookId, onCount]);
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setViewport({ width: element.clientWidth, height: element.clientHeight }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!pinned.size) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pinned.size]);

  const entries = useMemo(
    () => buildTimeline(pages, documents),
    [pages, documents],
  );
  const rows = useMemo(
    () => layoutTimeline(entries, sizes, viewport, zoom),
    [entries, sizes, viewport, zoom],
  );
  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element || !rows.length) return;
    let top = anchoredScroll(previousRows.current, rows, element.scrollTop);
    if (pendingJump.current) {
      const target = rows.find((row) => row.entry.key === pendingJump.current);
      const fallback =
        rows.find((row) => row.entry.key === initialKey) ?? rows[0];
      top = (target ?? fallback).top;
      if (target) pendingJump.current = null;
    }
    element.scrollTop = top;
    previousRows.current = rows;
    setScrollTop(element.scrollTop);
  }, [rows, jumpVersion, initialKey]);
  const range = visibleRows(rows, scrollTop, viewport.height);
  const rowsByKey = useMemo(
    () => new Map(rows.map((row) => [row.entry.key, row])),
    [rows],
  );
  const rendered = rows.slice(range.start, range.end);
  for (const key of pinned) {
    const row = rowsByKey.get(key);
    if (row && !rendered.includes(row)) rendered.push(row);
  }
  const active =
    rows[rowAtOffset(rows, scrollTop + Math.min(150, viewport.height / 4))]
      ?.entry;
  const totalHeight = rows.length
    ? rows[rows.length - 1].top + rows[rows.length - 1].height + 16
    : 0;
  const totalWidth = useMemo(
    () => timelineWidth(rows, viewport.width),
    [rows, viewport.width],
  );

  const onSize = useCallback((key: string, size: PageSize) => {
    setSizes((current) =>
      current[key]?.width === size.width && current[key]?.height === size.height
        ? current
        : { ...current, [key]: size },
    );
  }, []);
  const onBusy = useCallback((key: string, busy: boolean) => {
    setPinned((current) => {
      if (current.has(key) === busy) return current;
      const next = new Set(current);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  function jump(key: string) {
    pendingJump.current = key;
    setJumpVersion((value) => value + 1);
    window.history.replaceState(
      window.history.state,
      "",
      `#${encodeURIComponent(key)}`,
    );
    if (window.matchMedia("(max-width: 760px)").matches) setSidebarOpen(false);
  }
  const ensureBookmarks = useCallback((documentId: string) => {
    const running = bookmarkLoads.current.get(documentId);
    if (running) return running;
    const request = getDocumentBookmarks(documentId)
      .then((items) => {
        if (alive.current)
          setPdfBookmarks((current) => ({ ...current, [documentId]: items }));
      })
      .catch((reason) => {
        bookmarkLoads.current.delete(documentId);
        if (alive.current)
          setError(
            reason instanceof Error
              ? reason.message
              : "PDF bookmarks could not be loaded.",
          );
      });
    bookmarkLoads.current.set(documentId, request);
    return request;
  }, []);
  useEffect(() => {
    if (active?.kind === "pdf") void ensureBookmarks(active.document.id);
  }, [active, ensureBookmarks]);
  const isBookmarked = (entry: TimelineEntry) =>
    entry.kind === "note"
      ? entry.page.bookmarked
      : entry.kind === "document"
        ? entry.document.bookmarked
        : (pdfBookmarks[entry.document.id] ?? []).includes(entry.pageNumber);

  async function toggleBookmark(entry: TimelineEntry) {
    if (savingBookmarks.current.has(entry.key)) return;
    if (entry.kind === "pdf" && !pdfBookmarks[entry.document.id]) {
      await ensureBookmarks(entry.document.id);
      return;
    }
    const next = !isBookmarked(entry);
    savingBookmarks.current.add(entry.key);
    setBookmarkBusy(new Set(savingBookmarks.current));
    try {
      if (entry.kind === "note") {
        const page = await updateNotebookPage(notebookId, entry.page.id, {
          bookmarked: next,
        });
        setPages((current) =>
          current.map((item) => (item.id === page.id ? page : item)),
        );
      } else if (entry.kind === "document") {
        const saved = await setSavedDocumentBookmark(
          notebookId,
          entry.document.id,
          next,
        );
        setDocuments((current) =>
          current.map((doc) =>
            doc.id === entry.document.id ? { ...doc, bookmarked: saved } : doc,
          ),
        );
      } else {
        await setDocumentBookmark(entry.document.id, entry.pageNumber, next);
        setPdfBookmarks((current) => ({
          ...current,
          [entry.document.id]: next
            ? [...(current[entry.document.id] ?? []), entry.pageNumber]
            : (current[entry.document.id] ?? []).filter(
                (page) => page !== entry.pageNumber,
              ),
        }));
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The bookmark could not be saved.",
      );
    } finally {
      savingBookmarks.current.delete(entry.key);
      setBookmarkBusy(new Set(savingBookmarks.current));
    }
  }
  function addNote() {
    if (
      active?.kind === "document" &&
      active.document.source_type === "pdf" &&
      active.document.status === "uploaded"
    )
      setDialog({ kind: "add", documentId: active.document.id, afterPage: 0 });
    else if (active?.kind === "pdf")
      setDialog({
        kind: "add",
        documentId: active.document.id,
        afterPage: active.pageNumber,
      });
    else if (active?.kind === "note" && active.page.document_id)
      setDialog({
        kind: "add",
        documentId: active.page.document_id,
        afterPage: active.page.after_document_page_number ?? 0,
      });
    else setDialog({ kind: "add" });
  }
  function closeSidebar() {
    setSidebarOpen(false);
    toggleRef.current?.focus();
  }
  const notebookHref = `/library?notebook=${encodeURIComponent(notebookId)}`;
  const selectedIndex = active
    ? entries.findIndex((entry) => entry.key === active.key)
    : -1;
  const pageEntries = useMemo(
    () => entries.filter((entry) => entry.kind !== "document"),
    [entries],
  );
  const pageIndex = active
    ? pageEntries.findIndex((entry) => entry.key === active.key)
    : -1;
  function adjacent(direction: number) {
    let index = selectedIndex + direction;
    while (
      index >= 0 &&
      index < entries.length &&
      entries[index].kind === "document"
    )
      index += direction;
    if (entries[index]) jump(entries[index].key);
  }

  return (
    <main
      className={styles.viewer}
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          sidebarOpen &&
          !(event.target instanceof Element && event.target.closest("dialog"))
        )
          closeSidebar();
      }}
    >
      <header className={styles.header}>
        <PagePanelToggle
          ref={toggleRef}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((value) => !value)}
          panelId="notebook-contents"
        />
        <Link
          className={styles.brand}
          href={notebookHref}
          aria-label="Back to notebook"
          onClick={(event) => {
            if (pinned.size) {
              event.preventDefault();
              setError(
                "Some ink is still saving or needs a retry. Return to the unsaved page before leaving.",
              );
            }
          }}
        >
          <Image
            src="/brand/coilora-mark.png"
            alt=""
            width={40}
            height={40}
            priority
          />
          <span>Coilora</span>
        </Link>
        <div className={styles.heading}>
          <h1>{title}</h1>
          <span>
            {active?.kind === "note"
              ? active.page.title
              : active?.kind === "pdf"
                ? `${active.document.title} · ${active.pageNumber} / ${active.document.page_count ?? "…"}`
                : "Notebook contents"}
          </span>
        </div>
        <Link
          className={styles.back}
          href={notebookHref}
          onClick={(event) => {
            if (pinned.size) {
              event.preventDefault();
              setError(
                "Some ink is still saving or needs a retry. Return to the unsaved page before leaving.",
              );
            }
          }}
        >
          ← Back to notebook
        </Link>
      </header>
      <nav className={styles.toolbar} aria-label="Notebook tools">
        <div className={styles.tools} role="group" aria-label="Drawing tool">
          {(["pan", "ink", "highlight", "eraser"] as const).map((option) => (
            <button
              type="button"
              key={option}
              className={option === "pan" ? styles.handTool : undefined}
              aria-label={option === "pan" ? "Scroll mode" : undefined}
              title={option === "pan" ? "Scroll without drawing" : undefined}
              aria-pressed={tool === option}
              onClick={() => setTool(option)}
            >
              {
                {
                  pan: <HandIcon />,
                  ink: "Pen",
                  highlight: "Highlighter",
                  eraser: "Eraser",
                }[option]
              }
            </button>
          ))}
        </div>
        <div className={styles.colors} role="group" aria-label="Ink color">
          {colors.map((value) => (
            <button
              type="button"
              key={value}
              style={{ backgroundColor: value }}
              aria-label={`Use ${value} ink`}
              aria-pressed={color === value}
              onClick={() => setColor(value)}
            />
          ))}
        </div>
        <button
          type="button"
          disabled={
            !active ||
            bookmarkBusy.has(active.key) ||
            (active.kind === "pdf" && !pdfBookmarks[active.document.id])
          }
          aria-pressed={active ? isBookmarked(active) : false}
          onClick={() => {
            if (active) void toggleBookmark(active);
          }}
        >
          <BookmarkIcon /> Bookmark
        </button>
        <button type="button" onClick={addNote} disabled={!loaded}>
          + Add note
        </button>
        <label className={styles.zoom}>
          Zoom{" "}
          <select
            value={zoom}
            onChange={(event) =>
              setZoom(
                event.target.value === "page" || event.target.value === "width"
                  ? event.target.value
                  : Number(event.target.value),
              )
            }
          >
            <option value="page">Fit page</option>
            <option value="width">Fit width</option>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => (
              <option key={value} value={value}>
                {value * 100}%
              </option>
            ))}
          </select>
        </label>
      </nav>
      {error ? (
        <div className={styles.error} role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              if (!loaded) setAttempt((value) => value + 1);
              setError(null);
            }}
          >
            {loaded ? "Dismiss" : "Retry"}
          </button>
        </div>
      ) : null}
      {pinned.size ? (
        <div className={styles.saveNotice}>
          Ink on {pinned.size} page(s) is active, saving, or needs a retry.{" "}
          <button type="button" onClick={() => jump([...pinned][0])}>
            Return to page
          </button>
        </div>
      ) : null}
      <div className={styles.workspace}>
        {sidebarOpen ? (
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Close page panel"
            tabIndex={-1}
            onClick={closeSidebar}
          />
        ) : null}
        {pool ? (
          <NotebookSidebar
            open={sidebarOpen}
            entries={entries}
            activeKey={active?.key}
            pool={pool}
            pdfBookmarks={pdfBookmarks}
            bookmarkBusy={bookmarkBusy}
            onJump={jump}
            onBookmark={(entry) => void toggleBookmark(entry)}
            onEnsureBookmarks={ensureBookmarks}
            onRename={(page) => setDialog({ kind: "rename", page })}
            onAdd={() => setDialog({ kind: "add" })}
          />
        ) : null}
        <div
          ref={viewportRef}
          className={styles.viewport}
          tabIndex={0}
          role="region"
          aria-label="Continuous notebook pages"
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          {!loaded ? (
            <p className={styles.loading}>Loading notebook contents...</p>
          ) : !entries.length ? (
            <p className={styles.loading}>
              This notebook is empty. Add a note to get started.
            </p>
          ) : null}
          <div
            className={styles.track}
            style={{ height: totalHeight, width: totalWidth }}
          >
            {rendered.map((row) =>
              row.entry.kind === "document" ? (
                <section
                  key={row.entry.key}
                  className={styles.documentHeading}
                  style={{ top: row.top, height: row.height }}
                  aria-label={row.entry.document.title}
                >
                  <h2>{row.entry.document.title}</h2>
                  <p>
                    {row.entry.document.source_type === "pdf" &&
                    row.entry.document.status === "uploaded"
                      ? `${row.entry.document.page_count ?? "Loading"} pages · Original file unchanged`
                      : "This file remains in your notebook. Continuous reading currently supports PDFs and note pages."}
                  </p>
                </section>
              ) : pool ? (
                <NotebookPageSurface
                  key={row.entry.key}
                  row={row}
                  notebookId={notebookId}
                  pool={pool}
                  tool={tool}
                  color={color}
                  visible={
                    row.top + row.height >= scrollTop - 400 &&
                    row.top <= scrollTop + viewport.height + 400
                  }
                  onSize={onSize}
                  onBusy={onBusy}
                />
              ) : null,
            )}
          </div>
        </div>
      </div>
      <footer className={styles.footer}>
        <button
          type="button"
          onClick={() => adjacent(-1)}
          disabled={selectedIndex <= 0}
        >
          ↑ Previous
        </button>
        <span>
          {pageIndex >= 0
            ? `${pageIndex + 1} of ${pageEntries.length} notebook pages`
            : "Continuous notebook"}
        </span>
        <button
          type="button"
          onClick={() => adjacent(1)}
          disabled={selectedIndex >= entries.length - 1}
        >
          Next ↓
        </button>
      </footer>
      {dialog ? (
        <NotebookPageDialog
          notebookId={notebookId}
          dialog={dialog}
          onClose={() => setDialog(null)}
          onSaved={(page) => {
            setPages((current) =>
              current.some((item) => item.id === page.id)
                ? current.map((item) => (item.id === page.id ? page : item))
                : [...current, page],
            );
            jump(noteKey(page.id));
          }}
        />
      ) : null}
    </main>
  );
}
