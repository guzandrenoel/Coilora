"use client";

import { useRef, useState, type FormEvent, type RefObject } from "react";
import { LibraryDialog } from "@/features/library/library-dialog";
import { deleteNotebookPage } from "@/lib/api/notebook-pages-client";
import type { NotebookPage } from "@/lib/api/types";
import styles from "./notebook-page-actions.module.css";

export function NotebookPageDeleteDialog({
  notebookId,
  page,
  blocked,
  onClose,
  onDeleted,
  fallbackFocusRef,
  permanent = false,
}: {
  notebookId: string;
  page: NotebookPage;
  blocked?: string;
  onClose: () => void;
  onDeleted: (page: NotebookPage) => void;
  fallbackFocusRef: RefObject<HTMLElement | null>;
  permanent?: boolean;
}) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || blocked) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await deleteNotebookPage(notebookId, page.id, permanent);
      onDeleted(page);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The page could not be deleted. Please try again.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <LibraryDialog
      title={permanent ? "Permanently delete page?" : "Move page to Trash?"}
      busy={busy}
      onClose={onClose}
      fallbackFocusRef={fallbackFocusRef}
    >
      <form
        onSubmit={(event) => void submit(event)}
        className={styles.deleteForm}
      >
        <p>
          Remove <strong>{page.title}</strong> from this notebook?
        </p>
        <p>
          {permanent
            ? "This permanently deletes the page, its annotations, and its bookmark. This cannot be undone."
            : "You can restore this page, its annotations, and its bookmark from Trash. Imported documents will not be changed."}
        </p>
        {blocked ? <p role="status">{blocked}</p> : null}
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <div className={styles.buttons}>
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.deleteButton}
            disabled={busy || Boolean(blocked)}
          >
            {busy
              ? "Deleting..."
              : permanent
                ? "Delete permanently"
                : "Move to Trash"}
          </button>
        </div>
      </form>
    </LibraryDialog>
  );
}
