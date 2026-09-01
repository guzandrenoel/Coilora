"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { getDocumentBookmarks } from "@/lib/api/document-annotations-client";
import {
  getSavedDocuments,
  type SavedDocument,
} from "@/lib/api/documents-client";
import {
  createNotebookPage,
  getNotebookPages,
  updateNotebookPage,
} from "@/lib/api/notebook-pages-client";
import {
  paperStyles,
  type NotebookPage,
  type PaperStyle,
} from "@/lib/api/types";
import { LibraryDialog } from "@/features/library/library-dialog";
import workspaceStyles from "@/features/library/library-workspace.module.css";
import styles from "./notebook-page-sidebar.module.css";

const paperStyleNames: Record<PaperStyle, string> = {
  blank: "Blank",
  dotted: "Dotted",
  ruled: "Ruled",
  grid: "Grid",
  cornell: "Cornell",
};

type Dialog = { type: "add" } | { type: "rename"; page: NotebookPage };

export function NotebookPageSidebar({
  notebookId,
  selectedPageId,
  open,
  onClose,
  onPageUpdated,
}: {
  notebookId: string;
  selectedPageId: string;
  open: boolean;
  onClose: () => void;
  onPageUpdated: (page: NotebookPage) => void;
}) {
  const router = useRouter();
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [documentBookmarks, setDocumentBookmarks] = useState<
    Record<string, number>
  >({});
  const [filter, setFilter] = useState<"all" | "bookmarks">("all");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContents() {
      try {
        const loadedPages: NotebookPage[] = [];
        const loadedDocuments: SavedDocument[] = [];
        let pageCursor: number | null = 0;
        let documentCursor: number | null = 0;

        while (pageCursor !== null) {
          const result = await getNotebookPages(notebookId, pageCursor);
          loadedPages.push(...result.items);
          pageCursor = result.nextPage;
        }
        while (documentCursor !== null) {
          const result = await getSavedDocuments(notebookId, documentCursor);
          loadedDocuments.push(...result.items);
          documentCursor = result.nextPage;
        }

        const bookmarkEntries = await Promise.all(
          loadedDocuments
            .filter(
              (document) =>
                document.source_type === "pdf" &&
                document.status === "uploaded",
            )
            .map(async (document) => [
              document.id,
              (await getDocumentBookmarks(document.id)).length,
            ] as const),
        );

        if (!cancelled) {
          setPages(loadedPages);
          setDocuments(loadedDocuments);
          setDocumentBookmarks(Object.fromEntries(bookmarkEntries));
          setError(null);
        }
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Notebook contents could not be loaded.",
          );
        }
      }
    }

    void loadContents();
    return () => {
      cancelled = true;
    };
  }, [notebookId]);

  async function submitDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || busy) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) {
      setError("Enter a page name.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (dialog.type === "add") {
        const paperStyle = String(data.get("paperStyle") ?? "");
        if (!paperStyles.includes(paperStyle as PaperStyle)) {
          throw new Error("Choose a paper style.");
        }
        const created = await createNotebookPage(
          notebookId,
          title,
          paperStyle as PaperStyle,
        );
        setPages((current) => [...current, created]);
        setDialog(null);
        router.push(
          `/library/notebooks/${encodeURIComponent(
            notebookId,
          )}/pages/${encodeURIComponent(created.id)}`,
        );
      } else {
        const updated = await updateNotebookPage(
          notebookId,
          dialog.page.id,
          { title },
        );
        setPages((current) =>
          current.map((page) => (page.id === updated.id ? updated : page)),
        );
        onPageUpdated(updated);
        setDialog(null);
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "The page could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleBookmark(page: NotebookPage) {
    const optimistic = { ...page, bookmarked: !page.bookmarked };
    setPages((current) =>
      current.map((item) => (item.id === page.id ? optimistic : item)),
    );
    if (page.id === selectedPageId) onPageUpdated(optimistic);
    try {
      const updated = await updateNotebookPage(notebookId, page.id, {
        bookmarked: optimistic.bookmarked,
      });
      setPages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      if (updated.id === selectedPageId) onPageUpdated(updated);
    } catch (reason) {
      setPages((current) =>
        current.map((item) => (item.id === page.id ? page : item)),
      );
      if (page.id === selectedPageId) onPageUpdated(page);
      setError(
        reason instanceof Error ? reason.message : "The bookmark could not be saved.",
      );
    }
  }

  const visiblePages = pages.filter(
    (page) => filter === "all" || page.bookmarked,
  );
  const visibleDocuments = documents.filter(
    (document) =>
      filter === "all" || (documentBookmarks[document.id] ?? 0) > 0,
  );

  return (
    <>
      <aside
        className={styles.sidebar}
        data-open={open}
        aria-label="Notebook contents"
      >
        <header className={styles.header}>
          <h2>Notebook pages</h2>
          <button type="button" onClick={onClose} aria-label="Hide page panel">
            ×
          </button>
        </header>

        <div className={styles.filters} role="group" aria-label="Page filter">
          <button
            type="button"
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={filter === "bookmarks"}
            onClick={() => setFilter("bookmarks")}
          >
            Bookmarks
          </button>
        </div>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <div className={styles.scrollArea}>
          <ol className={styles.pages}>
            {visiblePages.map((page) => (
              <li key={page.id}>
                <div
                  className={styles.pageCard}
                  data-selected={page.id === selectedPageId}
                >
                  <Link
                    href={`/library/notebooks/${encodeURIComponent(
                      notebookId,
                    )}/pages/${encodeURIComponent(page.id)}`}
                    aria-label={`Open ${page.title}`}
                  >
                    <span
                      className={styles.paper}
                      data-paper-style={page.paper_style}
                    />
                  </Link>
                  <button
                    className={styles.bookmark}
                    type="button"
                    aria-label={`${page.bookmarked ? "Remove" : "Add"} bookmark for ${page.title}`}
                    aria-pressed={page.bookmarked}
                    onClick={() => void toggleBookmark(page)}
                  >
                    {page.bookmarked ? "★" : "☆"}
                  </button>
                </div>
                <div className={styles.pageMeta}>
                  <span title={page.title}>{page.title}</span>
                  <button
                    type="button"
                    aria-label={`Rename ${page.title}`}
                    onClick={() => {
                      setError(null);
                      setDialog({ type: "rename", page });
                    }}
                  >
                    ···
                  </button>
                </div>
              </li>
            ))}
          </ol>

          {visibleDocuments.length > 0 ? (
            <div className={styles.documents}>
              <h3>Documents</h3>
              {visibleDocuments.map((document) => (
                <Link
                  key={document.id}
                  className={styles.document}
                  href={`/library/documents/${encodeURIComponent(document.id)}`}
                  prefetch={false}
                >
                  <span className={styles.pdfMark}>PDF</span>
                  <span>
                    <strong>{document.title}</strong>
                    <small>
                      {document.page_count
                        ? `${document.page_count} pages`
                        : "PDF document"}
                      {(documentBookmarks[document.id] ?? 0) > 0
                        ? ` · ${documentBookmarks[document.id]} bookmarked`
                        : ""}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          <button
            className={styles.addPage}
            type="button"
            onClick={() => {
              setError(null);
              setDialog({ type: "add" });
            }}
          >
            <span aria-hidden="true">+</span>
            Add page
          </button>
        </div>
      </aside>

      {dialog ? (
        <LibraryDialog
          title={dialog.type === "add" ? "Add notebook page" : "Rename page"}
          busy={busy}
          onClose={() => setDialog(null)}
        >
          <form className={styles.form} onSubmit={(event) => void submitDialog(event)}>
            <label htmlFor="page-title">Page name</label>
            <input
              id="page-title"
              name="title"
              required
              maxLength={120}
              defaultValue={
                dialog.type === "rename"
                  ? dialog.page.title
                  : `Page ${pages.length + 1}`
              }
              autoFocus
            />

            {dialog.type === "add" ? (
              <fieldset>
                <legend>Paper style</legend>
                <div className={styles.paperChoices}>
                  {paperStyles.map((paperStyle) => (
                    <label key={paperStyle}>
                      <input
                        type="radio"
                        name="paperStyle"
                        value={paperStyle}
                        defaultChecked={paperStyle === "blank"}
                      />
                      <span
                        className={styles.paperChoice}
                        data-paper-style={paperStyle}
                      />
                      <strong>{paperStyleNames[paperStyle]}</strong>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className={workspaceStyles.dialogActions}>
              <button
                className={workspaceStyles.secondary}
                type="button"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                className={workspaceStyles.primary}
                type="submit"
                disabled={busy}
              >
                {busy ? "Saving..." : dialog.type === "add" ? "Add page" : "Save name"}
              </button>
            </div>
          </form>
        </LibraryDialog>
      ) : null}
    </>
  );
}
