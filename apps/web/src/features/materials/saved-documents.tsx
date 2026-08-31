"use client";

import { useEffect, useId, useState } from "react";

import { FileIcon } from "@/components/ui/icons";
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
};

export function SavedDocuments({
  notebookId,
  notebookTitle,
}: SavedDocumentsProps) {
  const headingId = useId();
  const [refreshVersion, setRefreshVersion] = useState(0);

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div>
          <h3 id={headingId}>Saved documents</h3>
          <p>
            {notebookId
              ? `Files saved in ${notebookTitle}`
              : "Select a notebook above to view its saved files."}
          </p>
        </div>

        <button
          className={styles.button}
          type="button"
          disabled={!notebookId}
          onClick={() => setRefreshVersion((current) => current + 1)}
        >
          Refresh
          <span className="sr-only"> saved documents</span>
        </button>
      </header>

      {notebookId ? (
        <DocumentList
          key={`${notebookId}:${refreshVersion}`}
          notebookId={notebookId}
        />
      ) : null}
    </section>
  );
}

function DocumentList({ notebookId }: { notebookId: string }) {
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
        <ul className={styles.list}>
          {documents.map((document) => (
            <li className={styles.row} key={document.id}>
              <span className={styles.icon}>
                <FileIcon />
              </span>

              <div className={styles.details}>
                <h4>{document.title}</h4>
                <p>{document.original_filename}</p>
                <p>
                  {document.source_type.toUpperCase()} ·{" "}
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
              </div>

              <span
                className={styles.badge}
                data-status={document.status}
              >
                {statusLabels[document.status]}
              </span>
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
          No saved documents in this notebook yet. Upload a file above to
          get started.
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
        <p className={styles.message}>
          These files remain saved when you refresh or clear the upload
          queue. Uploaded files have not been processed yet.
        </p>
      ) : null}
    </div>
  );
}