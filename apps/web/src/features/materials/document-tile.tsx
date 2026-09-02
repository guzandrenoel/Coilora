"use client";

import Link from "next/link";
import { useState } from "react";
import { BookmarkIcon } from "@/components/ui/icons";
import {
  setSavedDocumentBookmark,
  type SavedDocument,
} from "@/lib/api/documents-client";
import { DocumentPreview } from "./document-preview";
import styles from "./document-tile.module.css";

export function DocumentTile({
  document,
  openInNewTab = false,
  compact = false,
  onBookmarkChange,
}: {
  document: SavedDocument;
  openInNewTab?: boolean;
  compact?: boolean;
  onBookmarkChange?: (documentId: string, bookmarked: boolean) => void;
}) {
  const [bookmarked, setBookmarked] = useState(document.bookmarked);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const canOpen =
    document.source_type === "pdf" && document.status === "uploaded";

  async function toggleBookmark() {
    if (saving) return;
    const previous = bookmarked;
    setSaving(true);
    setBookmarked(!previous);
    setError(null);
    try {
      const saved = await setSavedDocumentBookmark(
        document.notebook_id,
        document.id,
        !previous,
      );
      setBookmarked(saved);
      onBookmarkChange?.(document.id, saved);
    } catch (reason) {
      setBookmarked(previous);
      setError(
        reason instanceof Error
          ? reason.message
          : "The bookmark could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  const contents = (
    <>
      <DocumentPreview
        key={`${document.id}:${document.revision}`}
        documentId={document.id}
        title={document.title}
        enabled={document.status === "uploaded"}
        attempt={attempt}
        onError={setPreviewError}
      />
      <span className={styles.title} title={document.title}>
        {document.title}
      </span>
      <time className={styles.date} dateTime={document.created_at}>
        {new Date(document.created_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </time>
    </>
  );

  return (
    <article className={styles.tile} data-compact={compact}>
      {canOpen ? (
        <Link
          className={styles.open}
          href={`/library/documents/${encodeURIComponent(document.id)}`}
          prefetch={false}
          target={openInNewTab ? "_blank" : undefined}
          rel={openInNewTab ? "noopener noreferrer" : undefined}
          aria-label={`Open ${document.title}${openInNewTab ? " in new tab" : ""}`}
        >
          {contents}
        </Link>
      ) : (
        <div className={styles.open}>{contents}</div>
      )}
      <button
        type="button"
        className={styles.bookmark}
        aria-pressed={bookmarked}
        aria-label={`${bookmarked ? "Remove" : "Add"} document bookmark for ${document.title}`}
        title={bookmarked ? "Remove document bookmark" : "Bookmark document"}
        disabled={saving}
        onClick={() => void toggleBookmark()}
      >
        <BookmarkIcon />
      </button>
      {previewError ? (
        <button
          type="button"
          className={styles.retry}
          onClick={() => setAttempt((value) => value + 1)}
        >
          Retry preview
        </button>
      ) : null}
      {document.status !== "uploaded" ? (
        <p className={styles.status}>{document.status.replaceAll("_", " ")}</p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}
