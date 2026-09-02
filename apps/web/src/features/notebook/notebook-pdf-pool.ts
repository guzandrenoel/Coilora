import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import {
  createDocumentReadSession,
  downloadDocumentPdf,
  recordDocumentPageCount,
} from "@/lib/api/document-read-client";
import { ResourcePool } from "./resource-pool";

export type NotebookPdfPool = ResourcePool<PDFDocumentProxy>;

export function createNotebookPdfPool(
  notebookId: string,
  onCount: (documentId: string, count: number) => void,
) {
  const controllers = new Set<AbortController>();
  const pool = new ResourcePool<PDFDocumentProxy>(
    2,
    async (documentId) => {
      const controller = new AbortController();
      controllers.add(controller);
      let task: PDFDocumentLoadingTask | undefined;
      const timeout = window.setTimeout(() => controller.abort(), 120000);
      const stop = () => {
        void task?.destroy().catch(() => undefined);
      };
      controller.signal.addEventListener("abort", stop);
      try {
        const session = await createDocumentReadSession(
          documentId,
          controller.signal,
        );
        if (session.notebookId !== notebookId)
          throw new Error("This document is not in the selected notebook.");
        const [bytes, pdfjs] = await Promise.all([
          downloadDocumentPdf(session, controller.signal),
          import("pdfjs-dist"),
        ]);
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
        controller.signal.throwIfAborted();
        if (
          !Number.isSafeInteger(pdf.numPages) ||
          pdf.numPages < 1 ||
          pdf.numPages > 5000
        ) {
          throw new Error("PDFs must contain between 1 and 5,000 pages.");
        }
        onCount(documentId, pdf.numPages);
        if (session.pageCount !== pdf.numPages)
          void recordDocumentPageCount(documentId, pdf.numPages).catch(
            () => undefined,
          );
        return pdf;
      } catch (reason) {
        await task?.destroy().catch(() => undefined);
        if (controller.signal.aborted)
          throw new Error("Opening the PDF timed out. Please retry.");
        if (reason instanceof Error && reason.name === "PasswordException")
          throw new Error("Password-protected PDFs need an unlocked copy.");
        throw reason;
      } finally {
        clearTimeout(timeout);
        controller.signal.removeEventListener("abort", stop);
        controllers.delete(controller);
      }
    },
    (pdf) => pdf.loadingTask.destroy(),
  );
  return {
    pool,
    dispose: () => {
      for (const controller of controllers) controller.abort();
      pool.dispose();
    },
  };
}
