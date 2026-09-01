"use client";

import { useMemo, useState } from "react";

import { PenIcon, ArrowRightIcon, LibraryIcon } from "@/components/ui/icons";
import type { Course, Notebook } from "@/lib/api/types";

import { NotebookCover } from "./notebook-cover";

import { visibleNotebooks, type LibrarySort } from "./library-view";
import styles from "./library-collections.module.css";

type LibraryCollectionsProps = {
  notebooks: Notebook[];
  courses: Course[];
  courseId: string;
  onCourseChange: (id: string) => void;
  onOpen: (notebook: Notebook) => void;
  onCreate: () => void;
  onEdit: (notebook: Notebook) => void;
  editDisabled: boolean;
};

export function LibraryCollections({
  notebooks,
  courses,
  courseId,
  onCourseChange,
  onOpen,
  onCreate,
  onEdit,
  editDisabled,
}: LibraryCollectionsProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LibrarySort>("updated");
  const [view, setView] = useState<"grid" | "list">("grid");
  const visible = useMemo(
    () => visibleNotebooks(notebooks, courses, query, courseId, sort),
    [notebooks, courses, query, courseId, sort],
  );
  const courseNames = new Map(
    courses.map((course) => [course.id, course.name]),
  );
  const emptyCourse = !!courseId && !query.trim() && notebooks.length > 0;

  return (
    <section aria-label="Browse notebooks">
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <span className="sr-only">Search notebooks</span>
          <input
            type="search"
            placeholder="Search your notebooks"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              className={styles.clearSearch}
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              ×
            </button>
          ) : null}
        </label>
        <label>
          <span className="sr-only">Filter by course</span>
          <select
            value={courseId}
            onChange={(event) => onCourseChange(event.target.value)}
          >
            <option value="">All courses</option>
            <option value="uncategorized">No course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Sort notebooks</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as LibrarySort)}
          >
            <option value="updated">Last updated</option>
            <option value="title">Title A to Z</option>
          </select>
        </label>
        <div
          className={styles.viewToggle}
          role="group"
          aria-label="Notebook view"
        >
          <button
            type="button"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <rect x="4" y="4" width="6" height="6" rx="1" />
              <rect x="14" y="4" width="6" height="6" rx="1" />
              <rect x="4" y="14" width="6" height="6" rx="1" />
              <rect x="14" y="14" width="6" height="6" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="M9 5h11M9 12h11M9 19h11M4 5h1M4 12h1M4 19h1" />
            </svg>
          </button>
        </div>
      </div>
      <p className={styles.resultCount} role="status">
        {visible.length} {visible.length === 1 ? "notebook" : "notebooks"}{" "}
        {query || courseId ? "found" : "in your library"}
      </p>
      {visible.length ? (
        <ul className={view === "grid" ? styles.grid : styles.list}>
          {visible.map((notebook) => (
            <li className={styles.card} key={notebook.id}>
              <button
                className={styles.openNotebook}
                type="button"
                aria-label={`Open notebook: ${notebook.title}`}
                onClick={() => onOpen(notebook)}
              >
                <div className={styles.cover}>
                  <NotebookCover
                    title={notebook.title}
                    color={notebook.cover_color}
                  />
                </div>
                <div className={styles.cardCopy}>
                  <span className={styles.course}>
                    {courseNames.get(notebook.course_id ?? "") ?? "No course"}
                  </span>
                  <h2>{notebook.title}</h2>
                  <span className={styles.updated}>
                    Updated{" "}
                    <time dateTime={notebook.updated_at}>
                      {new Date(notebook.updated_at).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </time>
                  </span>
                </div>
                <ArrowRightIcon className={styles.openArrow} />
              </button>
              <button
                className={styles.archive}
                type="button"
                aria-label={`Edit notebook: ${notebook.title}`}
                title="Edit title and cover"
                disabled={editDisabled}
                onClick={() => onEdit(notebook)}
              >
                <PenIcon />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <LibraryIcon />
          <h2>
            {emptyCourse
              ? "No notebooks here yet."
              : notebooks.length
                ? "No matching notebooks"
                : "Make room for your next idea."}
          </h2>
          <p>
            {emptyCourse
              ? "Create a notebook to start organizing this part of your library."
              : notebooks.length
                ? "Try a different name or course to find what you need."
                : "Create a notebook, add your lecture files, and keep your study materials together."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (notebooks.length && !emptyCourse) {
                setQuery("");
                onCourseChange("");
              } else onCreate();
            }}
          >
            {emptyCourse
              ? "New notebook"
              : notebooks.length
                ? "Clear filters"
                : "Create your first notebook"}
          </button>
        </div>
      )}
    </section>
  );
}
