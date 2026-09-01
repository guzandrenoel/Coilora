"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./library-workspace.module.css";

export function LibraryDialog({
  title,
  busy,
  onClose,
  children,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const previousLabel =
      previous?.getAttribute("aria-label") ?? previous?.textContent;
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      dialog?.close();
      if (
        previous instanceof HTMLElement &&
        previous.isConnected &&
        previous.getClientRects().length &&
        (previous.getAttribute("aria-label") ?? previous.textContent) ===
          previousLabel
      )
        previous.focus();
      else document.getElementById("library-title")?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className={styles.dialogHeader}>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
