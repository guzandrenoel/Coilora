"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { NotebookPage } from "@/lib/api/types";
import styles from "./notebook-page-actions.module.css";

export function NotebookPageMenu({
  page,
  onRename,
  onDelete,
  deleteBlocked,
}: {
  page: NotebookPage;
  onRename?: (page: NotebookPage) => void;
  onDelete: (page: NotebookPage) => void;
  deleteBlocked?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    root.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function select(action: (page: NotebookPage) => void) {
    trigger.current?.focus();
    setOpen(false);
    action(page);
  }

  return (
    <div
      ref={root}
      className={styles.actions}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
        if (
          open &&
          ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
        ) {
          event.preventDefault();
          const items = Array.from(
            root.current?.querySelectorAll<HTMLButtonElement>(
              '[role="menuitem"]:not(:disabled)',
            ) ?? [],
          );
          const index = items.findIndex(
            (item) => item === document.activeElement,
          );
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? items.length - 1
                : (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    items.length) %
                  items.length;
          items[next]?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-label={`Page actions for ${page.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(true);
          }
        }}
      >
        <span aria-hidden="true">•••</span>
      </button>
      {open ? (
        <div
          id={menuId}
          className={styles.menu}
          role="menu"
          aria-label={`Actions for ${page.title}`}
        >
          {onRename ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => select(onRename)}
            >
              Rename page
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={styles.danger}
            disabled={Boolean(deleteBlocked)}
            title={deleteBlocked}
            onClick={() => select(onDelete)}
          >
            Delete page
          </button>
          {deleteBlocked ? (
            <p className={styles.hint}>{deleteBlocked}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
