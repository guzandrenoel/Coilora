"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import {
  getSavedDocuments,
  moveSavedDocument,
  type SavedDocument,
} from "@/lib/api/documents-client";
import type { Notebook } from "@/lib/api/types";

import { LibraryDialog } from "@/features/library/library-dialog";
import { DocumentTile } from "./document-tile";
import styles from "./saved-documents.module.css";

type SavedDocumentsProps = {
  notebookId: string;
  notebookTitle: string;
  notebooks: Notebook[];
  onMoved?: () => void;
  openInNewTab?: boolean;
};

export function SavedDocuments({
  notebookId,
  notebookTitle,
  notebooks,
  onMoved,
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
          notebooks={notebooks}
          onMoved={onMoved}
          openInNewTab={openInNewTab}
        />
      ) : null}
    </section>
  );
}

function DocumentList({
  notebookId,
  notebooks,
  onMoved,
  openInNewTab,
}: {
  notebookId: string;
  notebooks: Notebook[];
  onMoved?: () => void;
  openInNewTab: boolean;
}) {
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [page, setPage] = useState(0);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [movingDocument, setMovingDocument] = useState<SavedDocument | null>(
    null,
  );
  const [destinationNotebookId, setDestinationNotebookId] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const destinationNotebooks = notebooks.filter(
    (notebook) => notebook.id !== notebookId,
  );

  function requestMove(document: SavedDocument) {
    setMovingDocument(document);
    setDestinationNotebookId(destinationNotebooks[0]?.id ?? "");
    setMoveError(null);
  }

  async function submitMove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!movingDocument || !destinationNotebookId || isMoving) return;

    setIsMoving(true);
    setMoveError(null);
    try {
      await moveSavedDocument(
        notebookId,
        movingDocument.id,
        destinationNotebookId,
      );
      setDocuments((current) =>
        current.filter((document) => document.id !== movingDocument.id),
      );
      setMovingDocument(null);
      onMoved?.();
    } catch (error) {
      setMoveError(
        error instanceof Error
          ? error.message
          : "The document could not be moved.",
      );
    } finally {
      setIsMoving(false);
    }
  }

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
              <DocumentTile
                document={document}
                openInNewTab={openInNewTab}
                onMoveRequest={requestMove}
              />
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

      {movingDocument ? (
        <LibraryDialog
          title="Move document"
          busy={isMoving}
          onClose={() => setMovingDocument(null)}
        >
          <form
            className={styles.moveForm}
            onSubmit={(event) => void submitMove(event)}
          >
            <p>
              Move <strong>{movingDocument.title}</strong> and its connected
              notes, annotations, and bookmarks to another notebook.
            </p>

            {destinationNotebooks.length > 0 ? (
              <>
                <label htmlFor="document-destination">
                  Destination notebook
                </label>
                <select
                  id="document-destination"
                  value={destinationNotebookId}
                  disabled={isMoving}
                  required
                  onChange={(event) =>
                    setDestinationNotebookId(event.currentTarget.value)
                  }
                >
                  {destinationNotebooks.map((notebook) => (
                    <option key={notebook.id} value={notebook.id}>
                      {notebook.title}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <p>Create another notebook before moving this document.</p>
            )}

            {moveError ? (
              <p className={styles.moveError} role="alert">
                {moveError}
              </p>
            ) : null}

            <div className={styles.moveActions}>
              <button
                className={styles.button}
                type="button"
                disabled={isMoving}
                onClick={() => setMovingDocument(null)}
              >
                Cancel
              </button>
              <button
                className={styles.moveButton}
                type="submit"
                disabled={isMoving || !destinationNotebookId}
              >
                {isMoving ? "Moving..." : "Move document"}
              </button>
            </div>
          </form>
        </LibraryDialog>
      ) : null}
    </div>
  );
}
