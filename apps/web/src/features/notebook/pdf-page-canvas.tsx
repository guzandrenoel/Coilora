"use client";

import { useEffect, useRef, useState } from "react";
import type { RenderTask, PDFPageProxy } from "pdfjs-dist";
import type { NotebookPdfPool } from "./notebook-pdf-pool";
import type { PageSize } from "./notebook-timeline";
import styles from "./notebook-viewer.module.css";

export function PdfPageCanvas({
  pool,
  documentId,
  pageNumber,
  width,
  onSize,
  onReady,
  thumbnail = false,
}: {
  pool: NotebookPdfPool;
  documentId: string;
  pageNumber: number;
  width: number;
  onSize?: (size: PageSize) => void;
  onReady?: () => void;
  thumbnail?: boolean;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const callbacks = useRef({ onSize, onReady });
  useEffect(() => {
    callbacks.current = { onSize, onReady };
  }, [onSize, onReady]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    const controller = new AbortController();
    let renderTask: RenderTask | undefined;
    let canvas: HTMLCanvasElement | undefined;
    async function render() {
      let release: (() => void) | undefined;
      let page: PDFPageProxy | undefined;
      try {
        const lease = await pool.acquire(documentId, controller.signal);
        release = lease.release;
        page = await lease.value.getPage(pageNumber);
        controller.signal.throwIfAborted();
        const size = page.getViewport({ scale: 1 });
        if (
          ![size.width, size.height].every(
            (value) => Number.isFinite(value) && value > 0 && value <= 32768,
          )
        )
          throw new Error("Unsupported page dimensions.");
        callbacks.current.onSize?.({ width: size.width, height: size.height });
        const viewport = page.getViewport({ scale: width / size.width });
        const density = Math.min(
          window.devicePixelRatio || 1,
          2,
          4096 / viewport.width,
          4096 / viewport.height,
          Math.sqrt(4000000 / (viewport.width * viewport.height)),
        );
        canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width * density));
        canvas.height = Math.max(1, Math.floor(viewport.height * density));
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", `PDF page ${pageNumber}`);
        renderTask = page.render({
          canvas,
          viewport,
          transform: [density, 0, 0, density, 0, 0],
        });
        await renderTask.promise;
        controller.signal.throwIfAborted();
        host?.replaceChildren(canvas);
        setError(null);
        setReady(true);
        callbacks.current.onReady?.();
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "This page could not be rendered.",
          );
      } finally {
        page?.cleanup();
        release?.();
      }
    }
    void render();
    return () => {
      controller.abort();
      renderTask?.cancel();
      // The old page remains during zoom redraw, then is replaced atomically.
      if (canvas && !canvas.isConnected) {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, [pool, documentId, pageNumber, width, attempt]);
  return (
    <span className={styles.pdfCanvas}>
      <span ref={hostRef} className={styles.canvasHost} />
      {!ready && !error ? (
        <span className={styles.pageMessage}>
          Loading {thumbnail ? "preview" : "page"}...
        </span>
      ) : null}
      {error ? (
        <span className={styles.pageMessage} role="alert">
          <span>{thumbnail ? "Preview unavailable" : error}</span>
          {!thumbnail ? (
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry
            </button>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
