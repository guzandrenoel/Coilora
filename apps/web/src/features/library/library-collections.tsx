"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ArchiveIcon } from "@/components/ui/icons";
import {
  archiveCourse,
  archiveNotebook,
  createCourse,
  createNotebook,
  getCourses,
  getNotebooks,
} from "@/lib/api/library-client";
import type { Course, Notebook } from "@/lib/api/types";

import styles from "./library-collections.module.css";

export function LibraryCollections() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [courseName, setCourseName] = useState("");
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [archivingCourseId, setArchivingCourseId] = useState<string | null>(
    null,
  );
  const [pendingArchiveCourseId, setPendingArchiveCourseId] = useState<
    string | null
  >(null);
  const [notebookTitle, setNotebookTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [notebookError, setNotebookError] = useState<string | null>(null);
  const [archivingNotebookId, setArchivingNotebookId] = useState<
    string | null
  >(null);
  const [pendingArchiveNotebookId, setPendingArchiveNotebookId] =
    useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    Promise.all([getCourses(), getNotebooks()])
      .then(([courseItems, notebookItems]) => {
        if (isCancelled) {
          return;
        }

        setCourses(courseItems);
        setNotebooks(notebookItems);
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Your library could not be loaded.",
        );
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const courseNames = useMemo(
    () => new Map(courses.map((course) => [course.id, course.name])),
    [courses],
  );

  async function handleCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = courseName.trim();

    if (!name) {
      setCourseError("Enter a course name.");
      return;
    }

    setIsCreatingCourse(true);
    setCourseError(null);

    try {
      const course = await createCourse({ name });

      setCourses((currentCourses) => [
        course,
        ...currentCourses.filter((item) => item.id !== course.id),
      ]);
      setCourseName("");
    } catch (error: unknown) {
      setCourseError(
        error instanceof Error
          ? error.message
          : "The course could not be created.",
      );
    } finally {
      setIsCreatingCourse(false);
    }
  }

  function requestCourseArchive(courseId: string) {
    setCourseError(null);
    setPendingArchiveCourseId(courseId);
  }

  function cancelCourseArchive() {
    if (!archivingCourseId) {
      setPendingArchiveCourseId(null);
    }
  }

  async function confirmCourseArchive() {
    const courseId = pendingArchiveCourseId;

    if (!courseId) {
      return;
    }

    setArchivingCourseId(courseId);
    setCourseError(null);

    try {
      await archiveCourse(courseId);

      setCourses((currentCourses) =>
        currentCourses.filter((course) => course.id !== courseId),
      );

      if (selectedCourseId === courseId) {
        setSelectedCourseId("");
      }

      setPendingArchiveCourseId(null);
    } catch (error: unknown) {
      setCourseError(
        error instanceof Error
          ? error.message
          : "The course could not be archived.",
      );
    } finally {
      setArchivingCourseId(null);
    }
  }

  async function handleCreateNotebook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = notebookTitle.trim();

    if (!title) {
      setNotebookError("Enter a notebook title.");
      return;
    }

    setIsCreatingNotebook(true);
    setNotebookError(null);

    try {
      const notebook = await createNotebook({
        title,
        courseId: selectedCourseId || null,
      });

      setNotebooks((currentNotebooks) => [
        notebook,
        ...currentNotebooks.filter((item) => item.id !== notebook.id),
      ]);
      setNotebookTitle("");
    } catch (error: unknown) {
      setNotebookError(
        error instanceof Error
          ? error.message
          : "The notebook could not be created.",
      );
    } finally {
      setIsCreatingNotebook(false);
    }
  }

  function requestNotebookArchive(notebookId: string) {
  setNotebookError(null);
  setPendingArchiveNotebookId(notebookId);
}

function cancelNotebookArchive() {
  if (!archivingNotebookId) {
    setPendingArchiveNotebookId(null);
  }
}

async function confirmNotebookArchive() {
  const notebookId = pendingArchiveNotebookId;

  if (!notebookId) {
    return;
  }

  setArchivingNotebookId(notebookId);
  setNotebookError(null);

  try {
    await archiveNotebook(notebookId);

    setNotebooks((currentNotebooks) =>
      currentNotebooks.filter((notebook) => notebook.id !== notebookId),
    );

    setPendingArchiveNotebookId(null);
  } catch (error: unknown) {
    setNotebookError(
      error instanceof Error
        ? error.message
        : "The notebook could not be archived.",
    );
  } finally {
    setArchivingNotebookId(null);
  }
}

  return (
    <section className={styles.section} aria-labelledby="collections-title">
      <header className={styles.header}>
        <div>
          <p>Your workspace</p>
          <h2 id="collections-title">Courses and notebooks</h2>
        </div>
      </header>

      {isLoading ? (
        <p className={styles.status}>Loading your library...</p>
      ) : null}

      {errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className={styles.grid}>
          <article className={styles.panel}>
            <h3>Courses</h3>
            <form className={styles.createForm} onSubmit={handleCreateCourse}>
  <label className="sr-only" htmlFor="course-name">
    Course name
  </label>

  <div className={styles.fieldRow}>
    <input
      id="course-name"
      name="courseName"
      type="text"
      value={courseName}
      maxLength={120}
      placeholder="Course name"
      autoComplete="off"
      disabled={isCreatingCourse}
      onChange={(event) => {
        setCourseName(event.target.value);

        if (courseError) {
          setCourseError(null);
        }
      }}
    />

    <button
      type="submit"
      disabled={isCreatingCourse || !courseName.trim()}
    >
      {isCreatingCourse ? "Creating..." : "New course"}
    </button>
  </div>

  {courseError ? (
    <p className={styles.formError} role="alert">
      {courseError}
    </p>
  ) : null}
</form>

            {courses.length === 0 ? (
              <p className={styles.empty}>
                Create a course to organize related notebooks.
              </p>
            ) : (
              <ul className={styles.list}>
                {courses.map((course) => (
                  <li className={styles.listItem} key={course.id}>
                    <div className={styles.listCopy}>
                      <strong>{course.name}</strong>
                      {course.description ? (
                        <span>{course.description}</span>
                      ) : null}
                    </div>

                    {pendingArchiveCourseId === course.id ? (
                      <div
                        className={styles.confirmActions}
                        role="group"
                        aria-label={`Archive ${course.name}?`}
                      >
                        <button
                          className={styles.keepButton}
                          type="button"
                          disabled={archivingCourseId === course.id}
                          onClick={cancelCourseArchive}
                        >
                          Keep
                        </button>

                        <button
                          className={styles.confirmArchiveButton}
                          type="button"
                          disabled={archivingCourseId === course.id}
                          onClick={() => void confirmCourseArchive()}
                        >
                          {archivingCourseId === course.id
                            ? "Archiving..."
                            : "Archive"}
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.iconButton}
                        type="button"
                        aria-label={`Archive ${course.name}`}
                        onClick={() => requestCourseArchive(course.id)}
                      >
                        <ArchiveIcon />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.panel}>
            <h3>Notebooks</h3>

            <form className={styles.createForm} onSubmit={handleCreateNotebook}>
  <label className="sr-only" htmlFor="notebook-title">
    Notebook title
  </label>

  <input
    className={styles.fullInput}
    id="notebook-title"
    name="notebookTitle"
    type="text"
    value={notebookTitle}
    maxLength={160}
    placeholder="Notebook title"
    autoComplete="off"
    disabled={isCreatingNotebook}
    onChange={(event) => {
      setNotebookTitle(event.target.value);

      if (notebookError) {
        setNotebookError(null);
      }
    }}
  />

  <div className={styles.fieldRow}>
    <label className="sr-only" htmlFor="notebook-course">
      Course
    </label>

    <select
      id="notebook-course"
      name="courseId"
      value={selectedCourseId}
      disabled={isCreatingNotebook}
      onChange={(event) => setSelectedCourseId(event.target.value)}
    >
      <option value="">No course</option>

      {courses.map((course) => (
        <option key={course.id} value={course.id}>
          {course.name}
        </option>
      ))}
    </select>

    <button
      type="submit"
      disabled={isCreatingNotebook || !notebookTitle.trim()}
    >
      {isCreatingNotebook ? "Creating..." : "New notebook"}
    </button>
  </div>

  {notebookError ? (
    <p className={styles.formError} role="alert">
      {notebookError}
    </p>
  ) : null}
</form>

            {notebooks.length === 0 ? (
              <p className={styles.empty}>
                Your saved notebooks will appear here.
              </p>
            ) : (
              <ul className={styles.list}>
                {notebooks.map((notebook) => (
                  <li className={styles.listItem} key={notebook.id}>
                    <div className={styles.listCopy}>
                      <strong>{notebook.title}</strong>
                      <span>
                        {notebook.course_id
                          ? courseNames.get(notebook.course_id) ??
                            "Unknown course"
                          : "No course"}
                      </span>
                    </div>

                    {pendingArchiveNotebookId === notebook.id ? (
                      <div
                        className={styles.confirmActions}
                        role="group"
                        aria-label={`Archive ${notebook.title}?`}
                      >
                        <button
                          className={styles.keepButton}
                          type="button"
                          disabled={archivingNotebookId === notebook.id}
                          onClick={cancelNotebookArchive}
                        >
                          Keep
                        </button>

                        <button
                          className={styles.confirmArchiveButton}
                          type="button"
                          disabled={archivingNotebookId === notebook.id}
                          onClick={() => void confirmNotebookArchive()}
                        >
                          {archivingNotebookId === notebook.id
                            ? "Archiving..."
                            : "Archive"}
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.iconButton}
                        type="button"
                        aria-label={`Archive ${notebook.title}`}
                        onClick={() => requestNotebookArchive(notebook.id)}
                      >
                        <ArchiveIcon />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      ) : null}
    </section>
  );
}
