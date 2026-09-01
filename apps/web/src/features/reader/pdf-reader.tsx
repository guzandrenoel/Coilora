"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";

import { ArrowRightIcon, LibraryIcon } from "@/components/ui/icons";
import {
  getDocumentBookmarks,
  setDocumentBookmark,
} from "@/lib/api/document-annotations-client";
import { getPageScale, type PdfZoom } from "./pdf-layout";
import { PdfThumbnails } from "./pdf-thumbnails";
import {
  createDocumentReadSession,
  downloadDocumentPdf,
  recordDocumentPageCount,
} from "@/lib/api/document-read-client";
import {
  createNotebookPage,
  getNotebookPages,
} from "@/lib/api/notebook-pages-client";
import {
  paperStyles,
  type NotebookPage,
  type PaperStyle,
} from "@/lib/api/types";
import {
  AnnotationCanvas,
  type EditorTool,
} from "@/features/editor/annotation-canvas";
import { LibraryDialog } from "@/features/library/library-dialog";
import workspaceStyles from "@/features/library/library-workspace.module.css";
import styles from "./pdf-reader.module.css";

type ReaderState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      pdf: PDFDocumentProxy;
      title: string;
      notebookId: string;
    };

const annotationColors = [
  "#173f5f",
  "#d94f70",
  "#e6b800",
  "#2b8a6e",
  "#7b61c9",
] as const;

export function PdfReader({ documentId }: { documentId: string }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <ReaderSession
      key={`${documentId}:${attempt}`}
      documentId={documentId}
      onRetry={() => setAttempt((current) => current + 1)}
    />
  );
}

function ReaderSession({
  documentId,
  onRetry,
}: {
  documentId: string;
  onRetry: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<ReaderState>({ kind: "loading" });
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState<PdfZoom>("page");
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [showPages, setShowPages] = useState(true);
  const [tool, setTool] = useState<EditorTool>("ink");
  const [color, setColor] = useState<string>(annotationColors[0]);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [attachedNotes, setAttachedNotes] = useState<NotebookPage[]>([]);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const pagesButtonRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let resizeTimeout: number | undefined;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        const width = viewport.clientWidth;
        const height = viewport.clientHeight;
        setSize((current) =>
          current.width === width && current.height === height
            ? current
            : { width, height },
        );
      }, 100);
    });
    observer.observe(viewport);
    return () => {
      observer.disconnect();
      window.clearTimeout(resizeTimeout);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | undefined;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 120000);
    const stopWorker = () => {
      void loadingTask?.destroy().catch(() => undefined);
    };
    controller.signal.addEventListener("abort", stopWorker);

    async function open() {
      try {
        const [session, pdfjs] = await Promise.all([
          createDocumentReadSession(documentId, controller.signal),
          import("pdfjs-dist"),
        ]);
        if (cancelled) return;
        controller.signal.throwIfAborted();

        const bytes = await downloadDocumentPdf(session, controller.signal);
        if (cancelled) return;
        controller.signal.throwIfAborted();

        const assets = `${window.location.origin}/pdfjs/${pdfjs.version}/`;
        pdfjs.GlobalWorkerOptions.workerSrc = `${assets}pdf.worker.min.mjs`;
        loadingTask = pdfjs.getDocument({
          data: bytes,
          cMapUrl: `${assets}cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `${assets}standard_fonts/`,
          wasmUrl: `${assets}wasm/`,
          iccUrl: `${assets}iccs/`,
          enableXfa: false,
          stopAtErrors: true,
          canvasMaxAreaInBytes: 32000000,
          verbosity: 0,
        });

        const pdf = await loadingTask.promise;
        if (cancelled) return;
        controller.signal.throwIfAborted();
        if (
          !Number.isSafeInteger(pdf.numPages) ||
          pdf.numPages < 1 ||
          pdf.numPages > 5000
        ) {
          throw new Error(
            "This reader supports PDFs containing 1 to 5,000 pages.",
          );
        }
        setState({
          kind: "ready",
          pdf,
          title: session.title,
          notebookId: session.notebookId,
        });
        if (session.pageCount !== pdf.numPages) {
          void recordDocumentPageCount(documentId, pdf.numPages).catch(
            () => undefined,
          );
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const name = error instanceof Error ? error.name : "";
        const message = controller.signal.aborted
          ? "Opening the PDF timed out. Check your connection and try again."
          : name === "PasswordException"
            ? "Password-protected PDFs are not supported yet. Use an unlocked copy."
            : name === "InvalidPDFException"
              ? "This file could not be read as a PDF. It may be damaged or unsupported."
              : loadingTask
                ? "The PDF could not be opened. Try again, or check whether the original file opens correctly."
                : error instanceof Error && error.name === "Error"
                  ? error.message
                  : "The PDF could not be loaded. Please try again.";
        setState({ kind: "error", message });
        controller.abort();
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void open();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
      controller.signal.removeEventListener("abort", stopWorker);
    };
  }, [documentId]);

  useEffect(() => {
    if (state.kind !== "ready") return;
    let cancelled = false;
    const notebookId = state.notebookId;

    async function loadConnectedContents() {
      const [savedBookmarks, pages] = await Promise.all([
        getDocumentBookmarks(documentId),
        (async () => {
          const items: NotebookPage[] = [];
          let cursor: number | null = 0;
          while (cursor !== null) {
            const result = await getNotebookPages(notebookId, cursor);
            items.push(...result.items);
            cursor = result.nextPage;
          }
          return items.filter((page) => page.document_id === documentId);
        })(),
      ]);

      if (!cancelled) {
        setBookmarks(new Set(savedBookmarks));
        setAttachedNotes(pages);
      }
    }

    void loadConnectedContents().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [documentId, state]);

  const ready = state.kind === "ready";
  // Only fit modes need to redraw when the viewport changes size.
  const renderWidth = typeof zoom === "string" ? size.width : 0;
  const renderHeight = zoom === "page" ? size.height : 0;

  function closePages() {
    setShowPages(false);
    pagesButtonRef.current?.focus();
  }

  function selectPage(page: number) {
    setPageNumber(page);
    viewportRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  async function toggleBookmark(page: number) {
    const bookmarked = !bookmarks.has(page);
    setBookmarks((current) => {
      const next = new Set(current);
      if (bookmarked) next.add(page);
      else next.delete(page);
      return next;
    });
    try {
      await setDocumentBookmark(documentId, page, bookmarked);
    } catch {
      setBookmarks((current) => {
        const next = new Set(current);
        if (bookmarked) next.delete(page);
        else next.add(page);
        return next;
      });
    }
  }

  async function addDocumentNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind !== "ready" || noteBusy) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const paperStyle = String(data.get("paperStyle") ?? "");
    if (!title) {
      setNoteError("Enter a page name.");
      return;
    }
    if (!paperStyles.includes(paperStyle as PaperStyle)) {
      setNoteError("Choose a paper style.");
      return;
    }

    setNoteBusy(true);
    setNoteError(null);
    try {
      const created = await createNotebookPage(
        state.notebookId,
        title,
        paperStyle as PaperStyle,
        {
          documentId,
          afterDocumentPageNumber: pageNumber,
        },
      );
      setAttachedNotes((current) => [...current, created]);
      setAddNoteOpen(false);
      router.push(
        `/library/notebooks/${encodeURIComponent(
          state.notebookId,
        )}/pages/${encodeURIComponent(created.id)}`,
      );
    } catch (reason) {
      setNoteError(
        reason instanceof Error
          ? reason.message
          : "The document note could not be added.",
      );
    } finally {
      setNoteBusy(false);
    }
  }

  return (
    <main
      className={styles.reader}
      onKeyDown={(event) => {
        if (event.key === "Escape" && showPages) closePages();
      }}
    >
      <a className="skip-link" href="#pdf-page">
        Skip to PDF page
      </a>
      <header className={styles.header}>
        <Link
          href={
            ready
              ? `/library?notebook=${encodeURIComponent(state.notebookId)}`
              : "/library"
          }
          className={styles.brand}
          aria-label="Coilora library"
        >
          <Image
            src="/brand/coilora-mark.png"
            alt=""
            width={32}
            height={32}
            priority
          />
          <span>Coilora</span>
        </Link>
        <h1 title={ready ? state.title : undefined}>
          {ready ? `PDF Reader · ${state.title}` : "PDF Reader"}
        </h1>
        <Link
          href={
            ready
              ? `/library?notebook=${encodeURIComponent(state.notebookId)}`
              : "/library"
          }
          className={styles.button}
        >
          <LibraryIcon /> Back to notebook
        </Link>
      </header>

      <div className={styles.toolbar} role="group" aria-label="PDF controls">
        <button
          ref={pagesButtonRef}
          type="button"
          className={styles.button}
          aria-controls={showPages ? "pdf-pages" : undefined}
          aria-expanded={showPages}
          disabled={!ready}
          onClick={() => setShowPages((current) => !current)}
        >
          <LibraryIcon /> Pages
        </button>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.button}
            disabled={!ready || pageNumber === 1}
            aria-label="Previous page"
            title="Previous page"
            onClick={() => selectPage(Math.max(1, pageNumber - 1))}
          >
            <ArrowRightIcon className={styles.previousIcon} />
          </button>
          <span
            className={styles.pageCount}
            aria-live="polite"
            aria-atomic="true"
          >
            {ready ? `${pageNumber} / ${state.pdf.numPages}` : "Opening PDF..."}
          </span>
          <button
            type="button"
            className={styles.button}
            disabled={!ready || pageNumber === state.pdf.numPages}
            aria-label="Next page"
            title="Next page"
            onClick={() => {
              if (ready)
                selectPage(Math.min(state.pdf.numPages, pageNumber + 1));
            }}
          >
            <ArrowRightIcon />
          </button>
        </div>
        <label className={styles.zoom}>
          Zoom
          <select
            value={zoom}
            disabled={!ready}
            onChange={(event) => {
              setZoom(
                event.target.value === "fit"
                  ? "fit"
                  : event.target.value === "page"
                    ? "page"
                    : Number(event.target.value),
              );
              viewportRef.current?.scrollTo({
                top: 0,
                left: 0,
                behavior: "instant",
              });
            }}
          >
            <option value="page">Fit page</option>
            <option value="fit">Fit width</option>
            {[0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((value) => (
              <option key={value} value={value}>
                {value * 100}%
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.annotationToolbar} aria-label="PDF annotation tools">
        <div className={styles.annotationTools} role="group" aria-label="Drawing tool">
          {(["ink", "highlight", "eraser"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={tool === option}
              onClick={() => setTool(option)}
            >
              {option === "ink"
                ? "Pen"
                : option === "highlight"
                  ? "Highlighter"
                  : "Eraser"}
            </button>
          ))}
        </div>
        <div className={styles.annotationColors} role="group" aria-label="Annotation color">
          {annotationColors.map((option) => (
            <button
              key={option}
              type="button"
              aria-label={`Use ${option} annotation color`}
              aria-pressed={color === option}
              style={{ backgroundColor: option }}
              onClick={() => setColor(option)}
            />
          ))}
        </div>
        <button
          className={styles.bookmarkButton}
          type="button"
          aria-pressed={bookmarks.has(pageNumber)}
          disabled={!ready}
          onClick={() => void toggleBookmark(pageNumber)}
        >
          {bookmarks.has(pageNumber) ? "★ Bookmarked" : "☆ Bookmark"}
        </button>
      </div>

      <div className={styles.workspace}>
        {ready && showPages ? (
          <>
            <button
              type="button"
              className={styles.sidebarBackdrop}
              aria-label="Close page list"
              onClick={closePages}
            />
            <PdfThumbnails
              pdf={state.pdf}
              selectedPage={pageNumber}
              bookmarkedPages={bookmarks}
              attachedNotes={attachedNotes}
              notebookId={state.notebookId}
              onClose={closePages}
              onAddNote={() => {
                setNoteError(null);
                setAddNoteOpen(true);
              }}
              onToggleBookmark={(page) => void toggleBookmark(page)}
              onSelect={(page) => {
                selectPage(page);
                if (window.matchMedia("(max-width: 640px)").matches)
                  closePages();
              }}
            />
          </>
        ) : null}
        <div
          id="pdf-page"
          ref={viewportRef}
          className={styles.viewport}
          tabIndex={0}
          role="region"
          aria-label="PDF page"
        >
          {state.kind === "loading" ? (
            <div className={styles.message} role="status">
              Loading your private PDF...
            </div>
          ) : state.kind === "error" ? (
            <div className={styles.message}>
              <p role="alert">{state.message}</p>
              <button className={styles.button} type="button" onClick={onRetry}>
                Try again
              </button>
            </div>
          ) : size.width > 0 && size.height > 0 ? (
            <RenderedPage
              key={`${pageNumber}:${zoom}:${renderWidth}:${renderHeight}`}
              pdf={state.pdf}
              pageNumber={pageNumber}
              zoom={zoom}
              width={renderWidth}
              height={renderHeight}
              onRetry={onRetry}
              documentId={documentId}
              tool={tool}
              color={color}
            />
          ) : null}
        </div>
      </div>
      <p className={styles.notice}>
        Your annotations and inserted note pages are saved separately. The
        original PDF stays unchanged.
      </p>

      {addNoteOpen ? (
        <LibraryDialog
          title="Add note after this PDF page"
          busy={noteBusy}
          onClose={() => setAddNoteOpen(false)}
        >
          <form className={styles.noteForm} onSubmit={(event) => void addDocumentNote(event)}>
            <label htmlFor="document-note-title">Page name</label>
            <input
              id="document-note-title"
              name="title"
              required
              maxLength={120}
              defaultValue={`Notes after PDF page ${pageNumber}`}
            />
            <label htmlFor="document-note-paper">Paper style</label>
            <select id="document-note-paper" name="paperStyle" defaultValue="blank">
              {paperStyles.map((paperStyle) => (
                <option key={paperStyle} value={paperStyle}>
                  {paperStyle[0].toUpperCase() + paperStyle.slice(1)}
                </option>
              ))}
            </select>
            {noteError ? <p role="alert">{noteError}</p> : null}
            <div className={workspaceStyles.dialogActions}>
              <button
                className={workspaceStyles.secondary}
                type="button"
                disabled={noteBusy}
                onClick={() => setAddNoteOpen(false)}
              >
                Cancel
              </button>
              <button
                className={workspaceStyles.primary}
                type="submit"
                disabled={noteBusy}
              >
                {noteBusy ? "Adding..." : "Add note page"}
              </button>
            </div>
          </form>
        </LibraryDialog>
      ) : null}
    </main>
  );
}

function RenderedPage({
  pdf,
  pageNumber,
  zoom,
  width,
  height,
  onRetry,
  documentId,
  tool,
  color,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  zoom: PdfZoom;
  width: number;
  height: number;
  onRetry: () => void;
  documentId: string;
  tool: EditorTool;
  color: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [pageText, setPageText] = useState("");
  const [surfaceSize, setSurfaceSize] = useState({ width: 0, height: 0 });

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
        const scale = getPageScale(
          zoom,
          base.width,
          base.height,
          width,
          height,
        );
        const viewport = page.getViewport({ scale });
        if (
          ![viewport.width, viewport.height].every(
            (size) => Number.isFinite(size) && size > 0 && size <= 32768,
          )
        ) {
          throw new Error("Unsupported page dimensions.");
        }

        // Bound the canvas backing store while preserving the requested CSS zoom.
        const density = Math.min(
          window.devicePixelRatio || 1,
          2,
          4096 / viewport.width,
          4096 / viewport.height,
          Math.sqrt(8000000 / (viewport.width * viewport.height)),
        );
        canvas.width = Math.max(1, Math.floor(viewport.width * density));
        canvas.height = Math.max(1, Math.floor(viewport.height * density));
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", `PDF page ${pageNumber}`);

        task = page.render({
          canvas,
          viewport,
          transform: [density, 0, 0, density, 0, 0],
        });
        await task.promise;
        if (cancelled) return;
        host.replaceChildren(canvas);
        setSurfaceSize({ width: viewport.width, height: viewport.height });
        setStatus("ready");

        const text = await page.getTextContent().catch(() => null);
        if (!cancelled && text) {
          setPageText(
            text.items.map((item) => ("str" in item ? item.str : "")).join(" "),
          );
        }
      } finally {
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
  }, [pdf, pageNumber, zoom, width, height]);

  return (
    <section
      className={styles.pageFrame}
      aria-label={`Page ${pageNumber}`}
      aria-busy={status === "loading"}
    >
      {status === "loading" ? (
        <p className={`${styles.message} ${styles.renderStatus}`} role="status">
          Rendering page {pageNumber}...
        </p>
      ) : null}
      {status === "error" ? (
        <div className={styles.message}>
          <p role="alert">
            This page could not be rendered. Try another page or reopen the PDF.
          </p>
          <button type="button" className={styles.button} onClick={onRetry}>
            Reopen PDF
          </button>
        </div>
      ) : null}
      <div
        className={styles.pageSurface}
        style={{
          width: surfaceSize.width || undefined,
          height: surfaceSize.height || undefined,
        }}
      >
        <div ref={hostRef} className={styles.canvasHost} />
        {status === "ready" ? (
          <AnnotationCanvas
            documentId={documentId}
            documentPageNumber={pageNumber}
            tool={tool}
            color={color}
          />
        ) : null}
      </div>
      {pageText ? <p className="sr-only">{pageText}</p> : null}
    </section>
  );
}
