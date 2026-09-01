"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getNotebookPage } from "@/lib/api/notebook-pages-client";
import type {
  NotebookPage,
  PaperStyle,
} from "@/lib/api/types";
import {
  AnnotationCanvas,
  type EditorTool,
} from "./annotation-canvas";
import { NotebookPageSidebar } from "./notebook-page-sidebar";
import styles from "./notebook-page-editor.module.css";

const paperStyleNames: Record<PaperStyle, string> = {
  blank: "Blank",
  dotted: "Dotted",
  ruled: "Ruled",
  grid: "Grid",
  cornell: "Cornell",
};

const annotationColors = [
  "#173f5f",
  "#d94f70",
  "#e6b800",
  "#2b8a6e",
  "#7b61c9",
] as const;

export function NotebookPageEditor({
  notebookId,
  pageId,
}: {
  notebookId: string;
  pageId: string;
}) {
  const [page, setPage] = useState<NotebookPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tool, setTool] = useState<EditorTool>("ink");
  const [color, setColor] = useState<string>(
    annotationColors[0],
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const notebookHref = `/library?notebook=${encodeURIComponent(notebookId)}`;

  useEffect(() => {
    let cancelled = false;

    getNotebookPage(notebookId, pageId)
      .then((result) => {
        if (!cancelled) {
          setPage(result);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "The notebook page could not be loaded.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [notebookId, pageId, attempt]);

  return (
    <main className={styles.editor}>
      <header className={styles.header}>
        <Link
          href={notebookHref}
          className={styles.brand}
          aria-label="Return to notebook"
        >
          <Image
            src="/brand/coilora-mark.png"
            alt=""
            width={44}
            height={44}
            priority
          />
          <span>Coilora</span>
        </Link>

        <div className={styles.title}>
          <h1>
            {page ? page.title : "Notebook page"}
          </h1>
          <p>
            {page
              ? `${paperStyleNames[page.paper_style]} paper`
              : "Private notebook"}
          </p>
        </div>

        <Link
          href={notebookHref}
          className={styles.libraryButton}
        >
          ← Back to notebook
        </Link>
      </header>

      <nav
        className={styles.toolbar}
        aria-label="Annotation tools"
      >
        <button
          className={styles.pagesButton}
          type="button"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((current) => !current)}
        >
          Pages
        </button>
        <div
          className={styles.toolGroup}
          role="group"
          aria-label="Drawing tool"
        >
          <button
            className={styles.toolButton}
            type="button"
            aria-pressed={tool === "ink"}
            onClick={() => setTool("ink")}
          >
            Pen
          </button>
          <button
            className={styles.toolButton}
            type="button"
            aria-pressed={tool === "highlight"}
            onClick={() => setTool("highlight")}
          >
            Highlighter
          </button>
          <button
            className={styles.toolButton}
            type="button"
            aria-pressed={tool === "eraser"}
            onClick={() => setTool("eraser")}
          >
            Eraser
          </button>
        </div>

        <div
          className={styles.colors}
          role="group"
          aria-label="Annotation color"
        >
          {annotationColors.map((option) => (
            <button
              className={styles.color}
              key={option}
              type="button"
              aria-label={`Use ${option} annotation color`}
              aria-pressed={color === option}
              style={{ backgroundColor: option }}
              onClick={() => setColor(option)}
            />
          ))}
        </div>
      </nav>

      <div className={styles.workspaceShell}>
        <NotebookPageSidebar
          notebookId={notebookId}
          selectedPageId={pageId}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onPageUpdated={(updated) => {
            if (updated.id === pageId) setPage(updated);
          }}
        />

        <section
          className={styles.workspace}
          aria-busy={!page && !error}
          aria-label="Notebook page workspace"
        >
        {!page && !error ? (
          <div className={styles.message} role="status">
            <p>Opening your notebook page...</p>
          </div>
        ) : null}

        {error ? (
          <div className={styles.message}>
            <p role="alert">{error}</p>
            <button
              className={styles.retry}
              type="button"
              onClick={() =>
                setAttempt((current) => current + 1)
              }
            >
              Try again
            </button>
          </div>
        ) : null}

        {page ? (
          <article
            className={styles.paper}
            data-paper-style={page.paper_style}
            aria-label={`Notebook page ${page.position}, ${
              paperStyleNames[page.paper_style]
            } paper`}
          >
            <AnnotationCanvas
              notebookId={notebookId}
              pageId={pageId}
              tool={tool}
              color={color}
            />
            <span className="sr-only">
              Notebook page canvas.
            </span>
          </article>
        ) : null}
        </section>
      </div>
    </main>
  );
}
