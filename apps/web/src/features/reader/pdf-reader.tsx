"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NotebookViewer } from "@/features/notebook/notebook-viewer";
import { documentKey } from "@/features/notebook/notebook-timeline";
import { createDocumentReadSession } from "@/lib/api/document-read-client";
import styles from "@/features/notebook/notebook-viewer.module.css";

export function PdfReader({ documentId }: { documentId: string }) {
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    createDocumentReadSession(documentId, controller.signal)
      .then((session) => {
        if (!cancelled) {
          setNotebookId(session.notebookId);
          setError(null);
        }
      })
      .catch((reason) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "The document could not be opened.",
          );
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [documentId, attempt]);
  if (notebookId)
    return (
      <NotebookViewer
        key={notebookId}
        notebookId={notebookId}
        initialKey={documentKey(documentId)}
      />
    );
  return (
    <main className={styles.loading}>
      <Link href="/library">← Back to library</Link>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      ) : (
        <p role="status">Opening this document in its notebook...</p>
      )}
    </main>
  );
}
