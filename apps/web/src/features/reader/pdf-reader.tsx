"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";

import { ArrowRightIcon, LibraryIcon, LockIcon } from "@/components/ui/icons";
import { getPageScale, type PdfZoom } from "./pdf-layout";
import { PdfThumbnails } from "./pdf-thumbnails";
import {
  createDocumentReadSession,
  downloadDocumentPdf,
} from "@/lib/api/document-read-client";
import styles from "./pdf-reader.module.css";

type ReaderState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; pdf: PDFDocumentProxy; title: string };

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
  const [state, setState] = useState<ReaderState>({ kind: "loading" });
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState<PdfZoom>("page");
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [showPages, setShowPages] = useState(false);
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
        setState({ kind: "ready", pdf, title: session.title });
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
          href="/library"
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
        <span className={styles.readOnly}>
          <LockIcon /> Read only
        </span>
        <Link href="/library" className={styles.button}>
          <LibraryIcon /> Library
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
              onClose={closePages}
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
            />
          ) : null}
        </div>
      </div>
      <p className={styles.notice}>
        Read-only PDF. Your original file is unchanged. Annotation tools are not
        enabled yet.
      </p>
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
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  zoom: PdfZoom;
  width: number;
  height: number;
  onRetry: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [pageText, setPageText] = useState("");

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
      <div ref={hostRef} className={styles.canvasHost} />
      {pageText ? <p className="sr-only">{pageText}</p> : null}
    </section>
  );
}
