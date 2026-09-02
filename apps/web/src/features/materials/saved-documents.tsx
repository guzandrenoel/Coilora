"use client";

import { useEffect, useId, useState } from "react";

import {
  getSavedDocuments,
  type SavedDocument,
} from "@/lib/api/documents-client";

import { DocumentTile } from "./document-tile";
import styles from "./saved-documents.module.css";

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
            <li key={document.id}>
              <DocumentTile document={document} openInNewTab={openInNewTab} />
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
