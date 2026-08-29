"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
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
  const [notebookTitle, setNotebookTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [notebookError, setNotebookError] = useState<string | null>(null);

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
                  <li key={course.id}>
                    <strong>{course.name}</strong>
                    {course.description ? (
                      <span>{course.description}</span>
                    ) : null}
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
                  <li key={notebook.id}>
                    <strong>{notebook.title}</strong>
                    <span>
                      {notebook.course_id
                        ? courseNames.get(notebook.course_id) ??
                          "Unknown course"
                        : "No course"}
                    </span>
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
