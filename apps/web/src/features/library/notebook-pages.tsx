"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  createNotebookPage,
  getNotebookPages,
} from "@/lib/api/notebook-pages-client";
import {
  paperStyles,
  type NotebookPage,
  type PaperStyle,
} from "@/lib/api/types";
import { LibraryDialog } from "./library-dialog";
import workspaceStyles from "./library-workspace.module.css";
import styles from "./notebook-pages.module.css";

const paperStyleNames: Record<PaperStyle, string> = {
  blank: "Blank",
  dotted: "Dotted",
  ruled: "Ruled",
  grid: "Grid",
  cornell: "Cornell",
};

function PaperPreview({ paperStyle }: { paperStyle: PaperStyle }) {
  return <span className={styles.paper} data-paper-style={paperStyle} />;
}

export function NotebookPages({ notebookId }: { notebookId: string }) {
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [page, setPage] = useState(0);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNotebookPages(notebookId, page)
      .then((result) => {
        if (cancelled) return;
        setPages((current) => {
          if (page === 0) return result.items;
          const merged = new Map(current.map((item) => [item.id, item]));
          for (const item of result.items) merged.set(item.id, item);
          return [...merged.values()].sort((a, b) => a.position - b.position);
        });
        setNextPage(result.nextPage);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Notebook pages could not be loaded.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notebookId, page, reloadVersion]);

  async function addPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const paperStyle = data.get("paperStyle");
    if (
      typeof paperStyle !== "string" ||
      !paperStyles.some((item) => item === paperStyle)
    ) {
      setFormError("Choose a paper style.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const created = await createNotebookPage(
        notebookId,
        paperStyle as PaperStyle,
      );
      setPages((current) =>
        [...current.filter((item) => item.id !== created.id), created].sort(
          (a, b) => a.position - b.position,
        ),
      );
      setAddOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The page could not be added.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.section} aria-labelledby="notebook-notes-title">
      <header className={styles.header}>
        <div>
          <h2 id="notebook-notes-title">Notes</h2>
          <p>Add blank paper for your own notes.</p>
        </div>
      </header>

      {loadError ? (
        <div className={styles.error}>
          <p role="alert">{loadError}</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              setReloadVersion((current) => current + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : null}

      {loading && pages.length === 0 ? (
        <p className={styles.status} role="status">
          Loading notes...
        </p>
      ) : null}

      {!loadError ? (
        <ol className={styles.grid}>
          {pages.map((notebookPage, index) => (
            <li className={styles.pageCard} key={notebookPage.id}>
              <PaperPreview paperStyle={notebookPage.paper_style} />
              <strong>Page {index + 1}</strong>
              <span>{paperStyleNames[notebookPage.paper_style]}</span>
            </li>
          ))}
          <li>
            <button
              className={styles.addPage}
              type="button"
              onClick={() => {
                setFormError(null);
                setAddOpen(true);
              }}
            >
              <span aria-hidden="true">+</span>
              <strong>Add page</strong>
            </button>
          </li>
        </ol>
      ) : null}

      {!loadError && nextPage !== null ? (
        <button
          className={styles.loadMore}
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setPage(nextPage);
          }}
        >
          {loading ? "Loading..." : "Load more pages"}
        </button>
      ) : null}

      {addOpen ? (
        <LibraryDialog
          title="Add blank page"
          busy={busy}
          onClose={() => setAddOpen(false)}
        >
          <form
            className={styles.form}
            onSubmit={(event) => void addPage(event)}
          >
            <fieldset className={styles.picker} disabled={busy}>
              <legend>Choose a paper style</legend>
              <div className={styles.options}>
                {paperStyles.map((paperStyle) => (
                  <label key={paperStyle}>
                    <input
                      type="radio"
                      name="paperStyle"
                      value={paperStyle}
                      defaultChecked={paperStyle === "blank"}
                      required
                    />
                    <span className={styles.choice}>
                      <PaperPreview paperStyle={paperStyle} />
                      <strong>{paperStyleNames[paperStyle]}</strong>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {formError ? (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            ) : null}
            <div className={workspaceStyles.dialogActions}>
              <button
                className={workspaceStyles.secondary}
                type="button"
                disabled={busy}
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </button>
              <button
                className={workspaceStyles.primary}
                type="submit"
                disabled={busy}
              >
                {busy ? "Adding..." : "Add page"}
              </button>
            </div>
          </form>
        </LibraryDialog>
      ) : null}
    </section>
  );
}
