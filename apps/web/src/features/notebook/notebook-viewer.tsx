"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  EraserIcon,
  HighlighterIcon,
  HomeIcon,
  PenIcon,
  RedoIcon,
  SelectIcon,
  TextIcon,
  UndoIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@/components/ui/icons";
import { AnnotationSettingsDock } from "@/features/editor/annotation-settings-dock";
import {
  annotationPreferencesStorageKey,
  defaultAnnotationToolPreferences,
  parseAnnotationToolPreferences,
  type DrawingStyle,
  type DrawingTool,
} from "@/features/editor/annotation-tool-settings";
import { PagePanelToggle } from "@/features/editor/page-panel-toggle";
import type { EditorTool } from "@/features/editor/annotation-canvas";
import {
  completeHistoryStep,
  emptyAnnotationHistory,
  historyEntry,
  recordAnnotationHistory,
} from "@/features/editor/annotation-history";
import {
  annotationCreateInput,
  createTargetAnnotation,
  deleteTargetAnnotation,
  updateTargetAnnotation,
  type AnnotationHistoryEntry,
} from "@/lib/api/annotation-target-client";
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
  clampNotebookZoom,
  layoutTimeline,
  MAX_NOTEBOOK_ZOOM,
  MIN_NOTEBOOK_ZOOM,
  noteKey,
  rowAtOffset,
  scaleNotebookZoom,
  selectionAfterNoteDeletion,
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
import { NotebookPageDeleteDialog } from "./notebook-page-delete-dialog";
import styles from "./notebook-viewer.module.css";

export function NotebookViewer({
  notebookId,
  initialKey,
}: {
  notebookId: string;
  initialKey: string;
}) {
  const router = useRouter();
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [title, setTitle] = useState("Notebook");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pool, setPool] = useState<NotebookPdfPool | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tool, setTool] = useState<EditorTool>("select");
  const [toolPreferences, setToolPreferences] = useState(() => {
    if (typeof window === "undefined") return defaultAnnotationToolPreferences();
    try {
      return parseAnnotationToolPreferences(
        window.localStorage.getItem(annotationPreferencesStorageKey),
      );
    } catch {
      return defaultAnnotationToolPreferences();
    }
  });
  const [annotationHistory, setAnnotationHistory] = useState(
    emptyAnnotationHistory,
  );
  const [historyBusy, setHistoryBusy] = useState(false);
  const [annotationRefreshVersions, setAnnotationRefreshVersions] = useState<
    Record<string, number>
  >({});
  const [thumbnailAnnotationVersions, setThumbnailAnnotationVersions] =
    useState<Record<string, number>>({});
  const [zoom, setZoom] = useState<NotebookZoom>("page");
  const [sizes, setSizes] = useState<Record<string, PageSize>>({});
  const [viewport, setViewport] = useState({ width: 900, height: 800 });
  const [scrollTop, setScrollTop] = useState(0);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<PageDialog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotebookPage | null>(null);
  const [pdfBookmarks, setPdfBookmarks] = useState<Record<string, number[]>>(
    {},
  );
  const [bookmarkBusy, setBookmarkBusy] = useState<Set<string>>(new Set());
  const savingBookmarks = useRef(new Set<string>());
  const viewportRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const zoomMenuRef = useRef<HTMLDetailsElement>(null);
  const previousRows = useRef<TimelineRow[]>([]);
  const previousTimelineWidth = useRef(viewport.width);
  const pendingZoomAnchor = useRef<{ x: number; y: number } | null>(null);
  const pinchGesture = useRef<{
    distance: number;
    scale: number;
  } | null>(null);
  const pendingJump = useRef<string | null>(initialKey);
  const [jumpVersion, setJumpVersion] = useState(0);
  const bookmarkLoads = useRef(new Map<string, Promise<void>>());
  const alive = useRef(true);
  const annotationHistoryRef = useRef(emptyAnnotationHistory);
  const historyBusyRef = useRef(false);
  const annotationRevisions = useRef(new Map<string, number>());

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(
        annotationPreferencesStorageKey,
        JSON.stringify(toolPreferences),
      );
    } catch {
      // Tool settings remain usable for the current viewer session.
    }
  }, [toolPreferences]);
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
  const totalWidth = useMemo(
    () => timelineWidth(rows, viewport.width),
    [rows, viewport.width],
  );
  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element || !rows.length) return;
    const oldRows = previousRows.current;
    const previousScrollTop = element.scrollTop;
    const zoomAnchor = pendingZoomAnchor.current;
    let top = zoomAnchor
      ? anchoredScroll(
          oldRows,
          rows,
          previousScrollTop + zoomAnchor.y,
        ) - zoomAnchor.y
      : anchoredScroll(oldRows, rows, previousScrollTop);
    if (pendingJump.current) {
      const target = rows.find((row) => row.entry.key === pendingJump.current);
      const fallback =
        rows.find((row) => row.entry.key === initialKey) ?? rows[0];
      top = (target ?? fallback).top;
      if (target) pendingJump.current = null;
    }
    element.scrollTop = top;
    if (zoomAnchor && oldRows.length) {
      const oldOffset = previousScrollTop + zoomAnchor.y;
      const oldRow = oldRows[rowAtOffset(oldRows, oldOffset)];
      const nextRow = oldRow
        ? rows.find((row) => row.entry.key === oldRow.entry.key)
        : undefined;
      if (
        oldRow &&
        nextRow &&
        oldRow.entry.kind !== "document" &&
        nextRow.entry.kind !== "document"
      ) {
        const oldPaperLeft =
          (previousTimelineWidth.current - oldRow.width) / 2;
        const nextPaperLeft = (totalWidth - nextRow.width) / 2;
        const paperRatio =
          (element.scrollLeft + zoomAnchor.x - oldPaperLeft) / oldRow.width;
        element.scrollLeft = Math.max(
          0,
          nextPaperLeft + paperRatio * nextRow.width - zoomAnchor.x,
        );
      }
    }
    previousRows.current = rows;
    previousTimelineWidth.current = totalWidth;
    pendingZoomAnchor.current = null;
    setScrollTop(element.scrollTop);
  }, [rows, totalWidth, jumpVersion, initialKey]);
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
  const rowNearViewport =
    rows[rowAtOffset(rows, scrollTop + Math.min(150, viewport.height / 4))];
  const zoomRow =
    rowNearViewport?.entry.kind !== "document"
      ? rowNearViewport
      : rows.find((row) => row.entry.kind !== "document");
  const zoomScale =
    typeof zoom === "number"
      ? clampNotebookZoom(zoom)
      : zoomRow && zoomRow.entry.kind !== "document"
        ? zoomRow.width /
          (sizes[zoomRow.entry.key]?.width ??
            (zoomRow.entry.kind === "note" ? 595 : 612))
        : 1;
  const zoomScaleRef = useRef(zoomScale);
  useEffect(() => {
    zoomScaleRef.current = zoomScale;
  }, [zoomScale]);
  const zoomPercent = Math.round(zoomScale * 100);

  const setZoomAround = useCallback(
    (next: NotebookZoom, clientX?: number, clientY?: number) => {
      const element = viewportRef.current;
      if (element) {
        const bounds = element.getBoundingClientRect();
        pendingZoomAnchor.current = {
          x:
            clientX === undefined
              ? element.clientWidth / 2
              : clientX - bounds.left,
          y:
            clientY === undefined
              ? element.clientHeight / 2
              : clientY - bounds.top,
        };
      }
      const safeNext =
        typeof next === "number" ? clampNotebookZoom(next) : next;
      setZoom((current) => {
        if (current === safeNext) {
          pendingZoomAnchor.current = null;
          return current;
        }
        return safeNext;
      });
    },
    [],
  );

  const changeZoom = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      setZoomAround(
        scaleNotebookZoom(zoomScaleRef.current, factor),
        clientX,
        clientY,
      );
    },
    [setZoomAround],
  );

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const distance = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );
    const beginPinch = (event: TouchEvent) => {
      if (tool !== "select" || event.touches.length !== 2) return;
      pinchGesture.current = {
        distance: Math.max(1, distance(event.touches)),
        scale: zoomScaleRef.current,
      };
    };
    const movePinch = (event: TouchEvent) => {
      const gesture = pinchGesture.current;
      if (!gesture || event.touches.length !== 2) return;
      event.preventDefault();
      const midpointX =
        (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const midpointY =
        (event.touches[0].clientY + event.touches[1].clientY) / 2;
      setZoomAround(
        gesture.scale * (distance(event.touches) / gesture.distance),
        midpointX,
        midpointY,
      );
    };
    const endPinch = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchGesture.current = null;
    };
    const zoomWithWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const pixels =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? event.deltaY * element.clientHeight
            : event.deltaY;
      changeZoom(Math.exp(-pixels * 0.0015), event.clientX, event.clientY);
    };

    element.addEventListener("wheel", zoomWithWheel, { passive: false });
    element.addEventListener("touchstart", beginPinch, { passive: true });
    element.addEventListener("touchmove", movePinch, { passive: false });
    element.addEventListener("touchend", endPinch);
    element.addEventListener("touchcancel", endPinch);
    return () => {
      element.removeEventListener("wheel", zoomWithWheel);
      element.removeEventListener("touchstart", beginPinch);
      element.removeEventListener("touchmove", movePinch);
      element.removeEventListener("touchend", endPinch);
      element.removeEventListener("touchcancel", endPinch);
    };
  }, [changeZoom, setZoomAround, tool]);

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
  const recordHistory = useCallback((entry: AnnotationHistoryEntry) => {
    if (entry.after) {
      annotationRevisions.current.set(entry.after.id, entry.after.revision);
    } else if (entry.before) {
      annotationRevisions.current.delete(entry.before.id);
    }
    setAnnotationHistory((current) => {
      const next = recordAnnotationHistory(current, entry);
      annotationHistoryRef.current = next;
      return next;
    });
    setThumbnailAnnotationVersions((versions) => ({
      ...versions,
      [entry.target.key]: (versions[entry.target.key] ?? 0) + 1,
    }));
  }, []);

  async function stepHistory(direction: "undo" | "redo") {
    if (historyBusyRef.current || pinned.size) return;
    const currentHistory = annotationHistoryRef.current;
    const entry = historyEntry(currentHistory, direction);
    if (!entry) return;

    const desired = direction === "undo" ? entry.before : entry.after;
    const current = direction === "undo" ? entry.after : entry.before;
    let replayed = entry;
    historyBusyRef.current = true;
    setHistoryBusy(true);
    setError(null);
    try {
      if (!desired) {
        if (!current) throw new Error("This history entry is unavailable.");
        await deleteTargetAnnotation(entry.target, current.id);
        annotationRevisions.current.delete(current.id);
      } else if (!current) {
        const created = await createTargetAnnotation(
          entry.target,
          annotationCreateInput(desired),
        );
        replayed =
          direction === "undo"
            ? { ...entry, before: created }
            : { ...entry, after: created };
        annotationRevisions.current.set(created.id, created.revision);
      } else {
        const updated = await updateTargetAnnotation(
          entry.target,
          current.id,
          {
            points: desired.points,
            revision:
              annotationRevisions.current.get(current.id) ?? current.revision,
            ...(desired.kind === "text"
              ? {
                  text: desired.text_content ?? "",
                  fontSize: desired.font_size ?? 0.025,
                  color: desired.color,
                }
              : {}),
          },
        );
        replayed =
          direction === "undo"
            ? { ...entry, before: updated }
            : { ...entry, after: updated };
        annotationRevisions.current.set(updated.id, updated.revision);
      }

      const next = completeHistoryStep(currentHistory, direction, replayed);
      annotationHistoryRef.current = next;
      setAnnotationHistory(next);
      setAnnotationRefreshVersions((versions) => ({
        ...versions,
        [entry.target.key]: (versions[entry.target.key] ?? 0) + 1,
      }));
      setThumbnailAnnotationVersions((versions) => ({
        ...versions,
        [entry.target.key]: (versions[entry.target.key] ?? 0) + 1,
      }));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : `The annotation could not be ${direction === "undo" ? "undone" : "redone"}.`,
      );
    } finally {
      historyBusyRef.current = false;
      setHistoryBusy(false);
    }
  }

  const canUndo =
    annotationHistory.past.length > 0 && !historyBusy && !pinned.size;
  const canRedo =
    annotationHistory.future.length > 0 && !historyBusy && !pinned.size;
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
  function closeSidebar() {
    setSidebarOpen(false);
    toggleRef.current?.focus();
  }
  const notebookHref = `/library?notebook=${encodeURIComponent(notebookId)}`;
  function pageDeleted(page: NotebookPage) {
    const next = selectionAfterNoteDeletion(entries, page.id, active?.key);
    setPages((current) => current.filter((item) => item.id !== page.id));
    if (!next) {
      router.replace(notebookHref);
      return;
    }
    if (next.key !== active?.key) jump(next.key);
    // Keep refresh and copied links off a page that has just been removed.
    if (
      window.location.pathname ===
      `/library/notebooks/${encodeURIComponent(notebookId)}/pages/${encodeURIComponent(page.id)}`
    ) {
      const href =
        next.kind === "note"
          ? `/library/notebooks/${encodeURIComponent(notebookId)}/pages/${encodeURIComponent(next.page.id)}`
          : next.document.source_type === "pdf" &&
              next.document.status === "uploaded"
            ? `/library/documents/${encodeURIComponent(next.document.id)}`
            : notebookHref;
      if (href === notebookHref) router.replace(href);
      else
        window.history.replaceState(
          window.history.state,
          "",
          `${href}#${encodeURIComponent(next.key)}`,
        );
    }
  }
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
  const drawingTool: DrawingTool | null =
    tool === "ink" || tool === "highlight" || tool === "text" ? tool : null;
  const drawingStyle = toolPreferences[drawingTool ?? "ink"];
  function updateDrawingStyle(next: DrawingStyle) {
    if (!drawingTool) return;
    setToolPreferences((current) => ({
      ...current,
      [drawingTool]: next,
    }));
  }

  return (
    <main
      className={styles.viewer}
      onKeyDown={(event) => {
        const target = event.target;
        const isTyping =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          (target instanceof HTMLElement && target.isContentEditable);
        const key = event.key.toLowerCase();
        const modifier = event.ctrlKey || event.metaKey;
        const direction =
          modifier && key === "z"
            ? event.shiftKey
              ? "redo"
              : "undo"
            : modifier && key === "y"
              ? "redo"
              : null;
        if (
          direction &&
          !event.altKey &&
          !isTyping &&
          (direction === "undo" ? canUndo : canRedo)
        ) {
          event.preventDefault();
          void stepHistory(direction);
          return;
        }
        if (
          event.key === "Escape" &&
          zoomMenuRef.current?.open
        ) {
          zoomMenuRef.current.open = false;
          return;
        }
        if (
          event.key === "Escape" &&
          sidebarOpen &&
          !(event.target instanceof Element && event.target.closest("dialog"))
        )
          closeSidebar();
      }}
    >
      <header className={styles.header}>
        <div className={styles.headerStart}>
          <Link
            className={styles.home}
            href={notebookHref}
            aria-label="Notebook home"
            title="Notebook home"
            onClick={(event) => {
              if (pinned.size) {
                event.preventDefault();
                setError(
                  "Some ink is still saving or needs a retry. Return to the unsaved page before leaving.",
                );
              }
            }}
          >
            <HomeIcon />
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
          <PagePanelToggle
            ref={toggleRef}
            open={sidebarOpen}
            onToggle={() => setSidebarOpen((value) => !value)}
            panelId="notebook-contents"
          />
        </div>
        <nav className={styles.editingControls} aria-label="Notebook tools">
          <div className={styles.tools} role="group" aria-label="Editing tool">
            {(["select", "ink", "highlight", "eraser", "text"] as const).map(
              (option) => (
                <button
                  type="button"
                  key={option}
                  className={styles.iconTool}
                  aria-label={
                    {
                      select: "Select and move annotations",
                      ink: "Pen",
                      highlight: "Highlighter",
                      eraser: "Eraser",
                      text: "Text",
                    }[option]
                  }
                  title={
                    {
                      select: "Select and move annotations",
                      ink: "Draw with pen",
                      highlight: "Highlight",
                      eraser: "Erase annotations",
                      text: "Type text",
                    }[option]
                  }
                  aria-pressed={tool === option}
                  onClick={() => setTool(option)}
                >
                  {
                    {
                      select: <SelectIcon />,
                      ink: <PenIcon />,
                      highlight: <HighlighterIcon />,
                      eraser: <EraserIcon />,
                      text: <TextIcon />,
                    }[option]
                  }
                </button>
              ),
            )}
          </div>
        </nav>
      </header>
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
      <div
        className={styles.workspace}
        data-sidebar-open={sidebarOpen}
        data-settings-open={Boolean(drawingTool)}
      >
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
            notebookId={notebookId}
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
            onDelete={setDeleteTarget}
            busyPages={pinned}
            onAdd={() => setDialog({ kind: "add" })}
            annotationVersions={thumbnailAnnotationVersions}
          />
        ) : null}
        {drawingTool ? (
          <AnnotationSettingsDock
            key={drawingTool}
            tool={drawingTool}
            style={drawingStyle}
            sidebarOpen={sidebarOpen}
            onChange={updateDrawingStyle}
          />
        ) : null}
        <div
          className={styles.historyControls}
          role="group"
          aria-label="Annotation history"
        >
          <button
            type="button"
            aria-label="Undo annotation change"
            title="Undo annotation change (Ctrl+Z)"
            disabled={!canUndo}
            onClick={() => void stepHistory("undo")}
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            aria-label="Redo annotation change"
            title="Redo annotation change (Ctrl+Shift+Z or Ctrl+Y)"
            disabled={!canRedo}
            onClick={() => void stepHistory("redo")}
          >
            <RedoIcon />
          </button>
        </div>
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
                  color={drawingStyle.color}
                  strokeWidth={drawingStyle.width}
                  opacity={drawingStyle.opacity}
                  visible={
                    row.top + row.height >= scrollTop - 400 &&
                    row.top <= scrollTop + viewport.height + 400
                  }
                  onSize={onSize}
                  onBusy={onBusy}
                  annotationRefreshVersion={
                    annotationRefreshVersions[row.entry.key] ?? 0
                  }
                  editorDisabled={historyBusy}
                  onAnnotationCommit={recordHistory}
                />
              ) : null,
            )}
          </div>
        </div>
        <div
          className={styles.zoomControls}
          role="group"
          aria-label="Page zoom"
        >
          <button
            type="button"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={zoomScale <= MIN_NOTEBOOK_ZOOM + 0.001}
            onClick={() => changeZoom(1 / 1.15)}
          >
            <ZoomOutIcon />
          </button>
          <details
            ref={zoomMenuRef}
            className={styles.zoomPicker}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                event.currentTarget.open = false;
              }
            }}
          >
            <summary
              aria-label={`Zoom is ${zoomPercent} percent. Choose zoom level.`}
              title="Choose zoom level"
            >
              {zoomPercent}%
            </summary>
            <div className={styles.zoomMenu} aria-label="Zoom presets">
              {(
                [
                  ["Fit page", "page"],
                  ["Fit width", "width"],
                  ["50%", 0.5],
                  ["75%", 0.75],
                  ["100%", 1],
                  ["125%", 1.25],
                  ["150%", 1.5],
                  ["200%", 2],
                ] as const
              ).map(([label, value]) => (
                <button
                  type="button"
                  key={label}
                  aria-pressed={zoom === value}
                  onClick={() => {
                    setZoomAround(value);
                    if (zoomMenuRef.current) zoomMenuRef.current.open = false;
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </details>
          <button
            type="button"
            aria-label="Zoom in"
            title="Zoom in"
            disabled={zoomScale >= MAX_NOTEBOOK_ZOOM - 0.001}
            onClick={() => changeZoom(1.15)}
          >
            <ZoomInIcon />
          </button>
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
      {deleteTarget ? (
        <NotebookPageDeleteDialog
          notebookId={notebookId}
          page={deleteTarget}
          fallbackFocusRef={viewportRef}
          blocked={
            pinned.has(noteKey(deleteTarget.id)) ||
            bookmarkBusy.has(noteKey(deleteTarget.id))
              ? "Finish saving this page before deleting it."
              : undefined
          }
          onClose={() => {
            setDeleteTarget(null);
          }}
          onDeleted={pageDeleted}
        />
      ) : null}
    </main>
  );
}
