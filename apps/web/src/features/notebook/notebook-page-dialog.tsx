"use client";
import { useState, type FormEvent } from "react";
import { LibraryDialog } from "@/features/library/library-dialog";
import {
  createNotebookPage,
  updateNotebookPage,
} from "@/lib/api/notebook-pages-client";
import {
  paperStyles,
  type NotebookPage,
  type PaperStyle,
} from "@/lib/api/types";
import styles from "./notebook-viewer.module.css";

export type PageDialog =
  | { kind: "rename"; page: NotebookPage }
  | { kind: "add"; documentId?: string; afterPage?: number };
export function NotebookPageDialog({
  notebookId,
  dialog,
  onClose,
  onSaved,
}: {
  notebookId: string;
  dialog: PageDialog;
  onClose: () => void;
  onSaved: (page: NotebookPage) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const paper = String(form.get("paperStyle") ?? "blank") as PaperStyle;
    if (!title || !paperStyles.includes(paper)) {
      setError("Choose a page name and paper style.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const page =
        dialog.kind === "rename"
          ? await updateNotebookPage(notebookId, dialog.page.id, { title })
          : await createNotebookPage(
              notebookId,
              title,
              paper,
              dialog.documentId
                ? {
                    documentId: dialog.documentId,
                    afterDocumentPageNumber: dialog.afterPage ?? 0,
                  }
                : undefined,
            );
      onSaved(page);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The page could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <LibraryDialog
      title={
        dialog.kind === "rename"
          ? "Rename page"
          : dialog.documentId
            ? dialog.afterPage
              ? `Add note after PDF page ${dialog.afterPage}`
              : "Add note before PDF page 1"
            : "Add notebook page"
      }
      busy={busy}
      onClose={onClose}
    >
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <label htmlFor="unified-page-title">Page name</label>
        <input
          id="unified-page-title"
          name="title"
          required
          maxLength={120}
          defaultValue={dialog.kind === "rename" ? dialog.page.title : ""}
          placeholder="Name your notes"
        />
        {dialog.kind === "add" ? (
          <fieldset>
            <legend>Paper style</legend>
            <div className={styles.paperChoices}>
              {paperStyles.map((paper) => (
                <label key={paper}>
                  <input
                    type="radio"
                    name="paperStyle"
                    value={paper}
                    defaultChecked={paper === "blank"}
                  />
                  <span
                    className={styles.paperSample}
                    data-paper-style={paper}
                  />
                  <span>{paper[0].toUpperCase() + paper.slice(1)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.formActions}>
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.primary} type="submit" disabled={busy}>
            {busy
              ? "Saving..."
              : dialog.kind === "rename"
                ? "Save name"
                : "Add page"}
          </button>
        </div>
      </form>
    </LibraryDialog>
  );
}
