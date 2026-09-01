"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import {
  getSavedDocuments,
  type SavedDocument,
} from "@/lib/api/documents-client";

import { formatFileSize } from "./material-file";
import styles from "./saved-documents.module.css";

const statusLabels: Record<SavedDocument["status"], string> = {
  uploaded: "Uploaded",
  validating: "Validating",
  quarantined: "Quarantined",
  extracting: "Extracting text",
  ocr_required: "OCR required",
  indexing: "Indexing",
  ready: "Ready",
  failed: "Processing failed",
};

type SavedDocumentsProps = {
  notebookId: string;
  notebookTitle: string;
  openInNewTab?: boolean;
};

export function SavedDocuments({
  notebookId,
  notebookTitle,
  openInNewTab = false,
}: SavedDocumentsProps) {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div>
          <h2 id={headingId}>Documents</h2>
          <p>
            {notebookId
              ? `Files saved in ${notebookTitle}`
              : "Open a notebook to view its saved files."}
          </p>
        </div>
      </header>

      {notebookId ? (
        <DocumentList
          key={notebookId}
          notebookId={notebookId}
          openInNewTab={openInNewTab}
        />
      ) : null}
    </section>
  );
}

function DocumentList({
  notebookId,
  openInNewTab,
}: {
  notebookId: string;
  openInNewTab: boolean;
}) {
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [page, setPage] = useState(0);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getSavedDocuments(notebookId, page)
      .then((result) => {
        if (cancelled) return;

        setDocuments((current) => {
          if (page === 0) return result.items;

          const merged = new Map(
            current.map((document) => [document.id, document]),
          );

          for (const document of result.items) {
            merged.set(document.id, document);
          }

          return [...merged.values()];
        });

        setNextPage(result.nextPage);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Your saved documents could not be loaded.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [notebookId, page, retryVersion]);

  return (
    <div aria-busy={isLoading}>
      {documents.length > 0 ? (
        <ul className={styles.grid}>
          {documents.map((document) => (
            <li className={styles.card} key={document.id}>
              <div className={styles.preview} data-type={document.source_type}>
                <span>{document.source_type.toUpperCase()}</span>
                <i />
                <i />
                <i />
              </div>

              <div className={styles.cardBody}>
                <h3>{document.title}</h3>
                <p className={styles.meta}>
                  {document.page_count
                    ? `${document.page_count} pages · `
                    : ""}
                  {formatFileSize(document.byte_size)} · Added{" "}
                  <time dateTime={document.created_at}>
                    {new Date(document.created_at).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </time>
                </p>
                <details className={styles.fileDetails}>
                  <summary>File details</summary>
                  <p>Original filename: {document.original_filename}</p>
                </details>
                {document.status !== "uploaded" ? (
                  <span className={styles.badge} data-status={document.status}>
                    {statusLabels[document.status]}
                  </span>
                ) : null}
                {document.source_type === "pdf" &&
                document.status === "uploaded" ? (
                  <Link
                    className={styles.button}
                    href={`/library/documents/${encodeURIComponent(document.id)}`}
                    prefetch={false}
                    target={openInNewTab ? "_blank" : undefined}
                    rel={openInNewTab ? "noopener noreferrer" : undefined}
                    aria-label={`Open in Reader${openInNewTab ? " in new tab" : ""}: ${document.title}`}
                  >
                    Open in Reader
                    <span aria-hidden="true">{openInNewTab ? "↗" : "→"}</span>
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {isLoading ? (
        <p className={styles.message} role="status">
          Loading saved documents...
        </p>
      ) : null}

      {!isLoading && !errorMessage && documents.length === 0 ? (
        <p className={styles.empty}>
          No documents yet. Add files to start filling this notebook.
        </p>
      ) : null}

      {errorMessage ? (
        <div className={styles.error}>
          <p role="alert">{errorMessage}</p>
          <button
            className={styles.button}
            type="button"
            disabled={isLoading}
            onClick={() => {
              setIsLoading(true);
              setErrorMessage(null);
              setRetryVersion((current) => current + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!errorMessage && nextPage !== null ? (
        <button
          className={styles.button}
          type="button"
          disabled={isLoading}
          onClick={() => {
            setIsLoading(true);
            setPage(nextPage);
          }}
        >
          Load more
        </button>
      ) : null}

      {documents.length > 0 ? (
        <p className={styles.message}>Your original files stay unchanged.</p>
      ) : null}
    </div>
  );
}
