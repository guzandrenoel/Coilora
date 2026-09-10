"use client";

import { useEffect, useRef, useState } from "react";
import { LibraryDialog } from "@/features/library/library-dialog";
import {
  deleteNotebookPage,
  getNotebookPages,
  restoreNotebookPage,
} from "@/lib/api/notebook-pages-client";
import type { NotebookPage } from "@/lib/api/types";
import trashStyles from "./notebook-trash.module.css";
import styles from "./notebook-page-actions.module.css";

export function NotebookTrash({
  notebookId,
  onRestored,
  disabled = false,
}: {
  notebookId: string;
  onRestored: (page: NotebookPage) => void;
  disabled?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        className={styles.trashTrigger}
        onClick={() => setOpen(true)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
        </svg>
        Trash
      </button>
      {open ? (
        <TrashContents
          notebookId={notebookId}
          onRestored={onRestored}
          onClose={() => setOpen(false)}
          trigger={trigger}
        />
      ) : null}
    </>
  );
}

function TrashContents({
  notebookId,
  onRestored,
  onClose,
  trigger,
}: {
  notebookId: string;
  onRestored: (page: NotebookPage) => void;
  onClose: () => void;
  trigger: React.RefObject<HTMLButtonElement | null>;
}) {
  const [items, setItems] = useState<NotebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [targets, setTargets] = useState<NotebookPage[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newestFirst, setNewestFirst] = useState(true);
  const heading = useRef<HTMLDivElement>(null);
  const selectAll = useRef<HTMLInputElement>(null);
  const selectedPages = items.filter((page) => selected.has(page.id));
  useEffect(() => {
    if (selectAll.current)
      selectAll.current.indeterminate =
        selectedPages.length > 0 && selectedPages.length < items.length;
  }, [selectedPages.length, items.length]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const pages: NotebookPage[] = [];
        let cursor: number | null = 0;
        while (cursor !== null && !cancelled) {
          const result = await getNotebookPages(notebookId, cursor, true);
          pages.push(...result.items);
          cursor = result.nextPage;
        }
        if (!cancelled) {
          setItems(pages);
          setSelected(new Set());
        }
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Trash could not be loaded.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [notebookId, version]);

  async function changePages(pages: NotebookPage[], permanent: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    let completed = 0;
    try {
      for (const page of pages) {
        if (permanent) await deleteNotebookPage(notebookId, page.id, true);
        else onRestored(await restoreNotebookPage(notebookId, page.id));
        completed++;
        setItems((current) => current.filter((item) => item.id !== page.id));
        setSelected((current) => {
          const next = new Set(current);
          next.delete(page.id);
          return next;
        });
      }
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "The action could not be completed.";
      setError(
        completed
          ? `${completed} of ${pages.length} pages completed. ${message} Remaining pages are still listed.`
          : message,
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
      setTargets(null);
      heading.current?.focus();
    }
  }
  const ordered = [...items].sort(
    (a, b) =>
      (newestFirst ? -1 : 1) *
      (Date.parse(a.updated_at) - Date.parse(b.updated_at)),
  );
  return (
    <>
      <LibraryDialog
        title="Trash"
        className={trashStyles.dialog}
        busy={busy || Boolean(targets)}
        onClose={onClose}
        fallbackFocusRef={trigger}
        headerActions={
          <button
            type="button"
            className={trashStyles.emptyButton}
            disabled={loading || busy || !items.length || Boolean(error)}
            onClick={() => setTargets([...items])}
          >
            Empty Trash
          </button>
        }
      >
        <div
          ref={heading}
          tabIndex={-1}
          className={trashStyles.contents}
          aria-busy={busy}
        >
          {selectedPages.length ? (
            <div className={trashStyles.selection}>
              <span>{selectedPages.length} selected</span>
              <button
                type="button"
                disabled={busy || loading}
                onClick={() => void changePages(selectedPages, false)}
              >
                Restore selected
              </button>
              <button
                type="button"
                disabled={busy || loading}
                onClick={() => setTargets(selectedPages)}
              >
                Delete selected
              </button>
            </div>
          ) : null}
          {loading ? <p role="status">Loading Trash...</p> : null}
          {busy ? <p role="status">Updating Trash...</p> : null}
          {error ? (
            <div className={styles.error}>
              <p role="alert">{error}</p>
              <button
                type="button"
                disabled={busy || loading}
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  setVersion((value) => value + 1);
                }}
              >
                Reload Trash
              </button>
            </div>
          ) : null}
          <div className={trashStyles.tableScroll}>
            <table className={trashStyles.table}>
              <thead>
                <tr>
                  <th className={trashStyles.checkbox}>
                    <input
                      ref={selectAll}
                      type="checkbox"
                      aria-label="Select all pages in Trash"
                      disabled={busy || loading || !items.length}
                      checked={
                        items.length > 0 &&
                        selectedPages.length === items.length
                      }
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? new Set(items.map((page) => page.id))
                            : new Set(),
                        )
                      }
                    />
                  </th>
                  <th scope="col">Title</th>
                  <th
                    scope="col"
                    aria-sort={newestFirst ? "descending" : "ascending"}
                  >
                    <button
                      type="button"
                      className={trashStyles.sort}
                      onClick={() => setNewestFirst((value) => !value)}
                    >
                      Last updated{" "}
                      <span aria-hidden="true">{newestFirst ? "⌄" : "⌃"}</span>
                    </button>
                  </th>
                  <th scope="col">
                    <span className={trashStyles.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((page) => (
                  <tr
                    key={page.id}
                    data-selected={selected.has(page.id) || undefined}
                  >
                    <td className={trashStyles.checkbox}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${page.title}`}
                        disabled={busy || loading}
                        checked={selected.has(page.id)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSelected((current) => {
                            const next = new Set(current);
                            if (checked) next.add(page.id);
                            else next.delete(page.id);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td>
                      <div className={trashStyles.page}>
                        <svg
                          viewBox="0 0 32 40"
                          width="30"
                          height="38"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M5 1h15l7 7v29a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2Z"
                            fill="#e5eef5"
                            stroke="#aec5d6"
                          />
                          <path
                            d="M20 1v8h7M9 18h12M9 24h12M9 30h8"
                            stroke="#86a6bd"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div>
                          <strong>{page.title}</strong>
                          <small>
                            {page.paper_style.charAt(0).toUpperCase() +
                              page.paper_style.slice(1)}{" "}
                            note page
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className={trashStyles.date}>
                      <time
                        dateTime={page.updated_at}
                        title={new Date(page.updated_at).toLocaleString()}
                      >
                        {new Date(page.updated_at).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </time>
                    </td>
                    <td>
                      <div className={trashStyles.rowActions}>
                        <button
                          type="button"
                          disabled={busy || loading}
                          onClick={() => void changePages([page], false)}
                          aria-label={`Restore ${page.title}`}
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          disabled={busy || loading}
                          onClick={() => setTargets([page])}
                          aria-label={`Permanently delete ${page.title}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !error && !items.length ? (
            <div className={trashStyles.empty}>
              <strong>Trash is empty</strong>
              <p>Deleted note pages will appear here.</p>
            </div>
          ) : null}
        </div>
      </LibraryDialog>
      {targets ? (
        <LibraryDialog
          title={
            targets.length === 1
              ? "Permanently delete page?"
              : `Permanently delete ${targets.length} pages?`
          }
          busy={busy}
          onClose={() => setTargets(null)}
          fallbackFocusRef={heading}
        >
          <div className={styles.deleteForm}>
            <p>
              {targets.length === 1
                ? `“${targets[0].title}” and its annotations will be permanently deleted.`
                : `These ${targets.length} pages and their annotations will be permanently deleted.`}{" "}
              This cannot be undone.
            </p>
            <div className={styles.buttons}>
              <button
                type="button"
                disabled={busy}
                onClick={() => setTargets(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.deleteButton}
                disabled={busy}
                onClick={() => void changePages(targets, true)}
              >
                {busy ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </LibraryDialog>
      ) : null}
    </>
  );
}
