"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import {
  createDocumentPreviewSession,
  downloadDocumentPdf,
} from "@/lib/api/document-read-client";
import styles from "./document-tile.module.css";

// Limit simultaneous source downloads and PDF workers even in large notebooks.
let activePreviews = 0;
const waitingPreviews: (() => void)[] = [];

async function acquirePreviewSlot(signal: AbortSignal): Promise<() => void> {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const start = () => {
      signal.removeEventListener("abort", abort);
      activePreviews += 1;
      resolve();
    };
    const abort = () => {
      const index = waitingPreviews.indexOf(start);
      if (index !== -1) waitingPreviews.splice(index, 1);
      reject(new DOMException("Preview cancelled", "AbortError"));
    };
    if (activePreviews < 2) start();
    else {
      waitingPreviews.push(start);
      signal.addEventListener("abort", abort, { once: true });
    }
  });
  return () => {
    activePreviews -= 1;
    waitingPreviews.shift()?.();
  };
}

export function DocumentPreview({
  documentId,
  title,
  enabled,
  attempt,
  onError,
}: {
  documentId: string;
  title: string;
  enabled: boolean;
  attempt: number;
  onError: (failed: boolean) => void;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!enabled) return;
    const host = hostRef.current;
    if (!host) return;
    const controller = new AbortController();
    let task: PDFDocumentLoadingTask | undefined;
    let started = false;
    let timeout: number | undefined;
    const abortTask = () => {
      void task?.destroy().catch(() => undefined);
    };
    controller.signal.addEventListener("abort", abortTask);

    async function renderPreview() {
      let release: (() => void) | undefined;
      try {
        release = await acquirePreviewSlot(controller.signal);
        controller.signal.throwIfAborted();
        timeout = window.setTimeout(() => controller.abort(), 60000);
        setStatus("loading");
        onError(false);
        const session = await createDocumentPreviewSession(
          documentId,
          controller.signal,
        );
        const bytes = await downloadDocumentPdf(session, controller.signal);
        controller.signal.throwIfAborted();
        const canvas = document.createElement("canvas");
        if (session.mediaType === "application/pdf") {
          const pdfjs = await import("pdfjs-dist");
          controller.signal.throwIfAborted();
          const assets = `${window.location.origin}/pdfjs/${pdfjs.version}/`;
          pdfjs.GlobalWorkerOptions.workerSrc = `${assets}pdf.worker.min.mjs`;
          task = pdfjs.getDocument({
            data: bytes,
            cMapUrl: `${assets}cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `${assets}standard_fonts/`,
            wasmUrl: `${assets}wasm/`,
            iccUrl: `${assets}iccs/`,
            enableXfa: false,
            stopAtErrors: true,
            canvasMaxAreaInBytes: 16000000,
            verbosity: 0,
          });
          const pdf = await task.promise;
          const page = await pdf.getPage(1);
          const base = page.getViewport({ scale: 1 });
          if (
            ![base.width, base.height].every(
              (value) => Number.isFinite(value) && value > 0,
            )
          ) {
            throw new Error("Unsupported page dimensions.");
          }
          const viewport = page.getViewport({
            scale: Math.min(360 / base.width, 480 / base.height),
          });
          canvas.width = Math.max(1, Math.ceil(viewport.width));
          canvas.height = Math.max(1, Math.ceil(viewport.height));
          await page.render({ canvas, viewport }).promise;
        } else if (session.mediaType.startsWith("image/")) {
          const bitmap = await createImageBitmap(
            new Blob([bytes as Uint8Array<ArrayBuffer>], {
              type: session.mediaType,
            }),
          );
          try {
            const scale = Math.min(360 / bitmap.width, 480 / bitmap.height);
            canvas.width = Math.max(1, Math.ceil(bitmap.width * scale));
            canvas.height = Math.max(1, Math.ceil(bitmap.height * scale));
            canvas
              .getContext("2d")
              ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          } finally {
            bitmap.close();
          }
        } else {
          canvas.width = 360;
          canvas.height = 480;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Preview canvas unavailable.");
          context.fillStyle = "white";
          context.fillRect(0, 0, 360, 480);
          context.fillStyle = "#213744";
          context.font = "14px sans-serif";
          const text = new TextDecoder().decode(bytes.subarray(0, 8192));
          let y = 28;
          for (const paragraph of text.split(/\r?\n/)) {
            let line = "";
            for (const character of paragraph) {
              if (context.measureText(line + character).width > 316) {
                context.fillText(line, 22, y);
                y += 21;
                line = "";
              }
              line += character;
              if (y > 464) break;
            }
            if (y > 464) break;
            context.fillText(line, 22, y);
            y += 21;
          }
        }
        controller.signal.throwIfAborted();
        canvas.setAttribute("aria-hidden", "true");
        host?.replaceChildren(canvas);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          onError(true);
        }
      } finally {
        window.clearTimeout(timeout);
        await task?.destroy().catch(() => undefined);
        release?.();
      }
    }

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !started) {
          started = true;
          observer.disconnect();
          void renderPreview();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(host);
    return () => {
      cancelled = true;
      observer.disconnect();
      controller.abort();
      window.clearTimeout(timeout);
      controller.signal.removeEventListener("abort", abortTask);
      host.replaceChildren();
    };
  }, [documentId, enabled, attempt, onError]);

  return (
    <span
      className={styles.preview}
      role="img"
      aria-label={`File preview: ${title}`}
    >
      <span ref={hostRef} className={styles.previewCanvas} />
      {!enabled || status !== "ready" ? (
        <span className={styles.placeholder}>
          {!enabled || status === "error"
            ? "Preview unavailable"
            : "Loading preview..."}
        </span>
      ) : null}
    </span>
  );
}
