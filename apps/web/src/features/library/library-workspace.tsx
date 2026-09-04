"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  ArchiveIcon,
  PenIcon,
  LibraryIcon,
  LockIcon,
  LogOutIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { MaterialImport } from "@/features/materials/material-import";
import { SavedDocuments } from "@/features/materials/saved-documents";
import {
  archiveCourse,
  archiveNotebook,
  createCourse,
  createNotebook,
  getCourses,
  getNotebooks,
  updateNotebook,
  updateCourse,
} from "@/lib/api/library-client";
import { isCoverColor, type Course, type Notebook } from "@/lib/api/types";
import { NotebookAppearance, NotebookCover } from "./notebook-cover";
import { NotebookPages } from "./notebook-pages";
import { CourseColorPicker, courseAccentColors } from "./course-color-picker";

import { LibraryCollections } from "./library-collections";
import { LibraryDialog } from "./library-dialog";
import { libraryHref } from "./library-view";
import styles from "./library-workspace.module.css";

type View = "notebooks" | "notebook" | "import";
type Dialog =
  | { type: "notebook"; courseId: string }
  | { type: "course" }
  | { type: "editCourse"; item: Course }
  | { type: "editNotebook"; item: Notebook }
  | { type: "archiveNotebook"; item: Notebook }
  | { type: "archiveCourse"; item: Course };

function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export function LibraryWorkspace({
  displayName,
  initialCourseId = "",
  initialImportNotebookId = "",
  initialNotebookId = "",
  initialView = "notebooks",
  signOutAction,
}: {
  displayName: string;
  initialCourseId?: string;
  initialImportNotebookId?: string;
  initialNotebookId?: string;
  initialView?: Extract<View, "notebooks" | "import">;
  signOutAction: () => Promise<void>;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("notebooks");
  const [courses, setCourses] = useState<Course[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [courseId, setCourseId] = useState("");
  const [activeNotebookId, setActiveNotebookId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const [documentsVersion, setDocumentsVersion] = useState(0);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importMounted, setImportMounted] = useState(false);
  const [importNotebookId, setImportNotebookId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const mutationLock = useRef(false);
  const dataEpoch = useRef(0);
  const lastRefresh = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const epoch = dataEpoch.current;
    Promise.all([getCourses(), getNotebooks()])
      .then(([nextCourses, nextNotebooks]) => {
        if (cancelled || epoch !== dataEpoch.current || mutationLock.current)
          return;
        setLoadError(null);
        setCourses(nextCourses);
        setNotebooks(nextNotebooks);
        const requestedNotebook = nextNotebooks.find(
          (notebook) => notebook.id === initialNotebookId,
        );
        const requestedCourseAvailable =
          initialCourseId === "uncategorized" ||
          nextCourses.some((course) => course.id === initialCourseId);
        const importTargetAvailable =
          !initialImportNotebookId ||
          nextNotebooks.some(
            (notebook) => notebook.id === initialImportNotebookId,
          );

        if (requestedNotebook) {
          setActiveNotebookId(initialNotebookId);
          setCourseId("");
          setView("notebook");
        } else if (initialNotebookId) {
          setActiveNotebookId("");
          setCourseId("");
          setView("notebooks");
          router.replace(libraryHref(), { scroll: false });
        } else if (initialView === "import") {
          setActiveNotebookId("");
          setCourseId("");
          setImportMounted(true);
          setImportNotebookId(
            importTargetAvailable ? initialImportNotebookId : "",
          );
          setView("import");
          if (!importTargetAvailable) {
            router.replace(libraryHref({ view: "import" }), { scroll: false });
          }
        } else if (initialCourseId && !requestedCourseAvailable) {
          setActiveNotebookId("");
          setCourseId("");
          setView("notebooks");
          router.replace(libraryHref(), { scroll: false });
        } else {
          setActiveNotebookId("");
          setCourseId(initialCourseId);
          setImportNotebookId((current) =>
            nextNotebooks.some((notebook) => notebook.id === current)
              ? current
              : "",
          );
          setView("notebooks");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && epoch === dataEpoch.current)
          setLoadError(message(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    initialCourseId,
    initialImportNotebookId,
    initialNotebookId,
    initialView,
    loadVersion,
    router,
  ]);

  useEffect(() => {
    function revalidate() {
      if (
        document.visibilityState !== "visible" ||
        busy ||
        dialog ||
        isUploading ||
        mutationLock.current ||
        Date.now() - lastRefresh.current < 5000
      )
        return;
      lastRefresh.current = Date.now();
      setLoadVersion((current) => current + 1);
      setDocumentsVersion((current) => current + 1);
    }
    window.addEventListener("focus", revalidate);
    window.addEventListener("online", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => {
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("online", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [busy, dialog, isUploading]);

  const selectedCourse = courses.find((course) => course.id === courseId);
  const activeNotebook = notebooks.find(
    (notebook) => notebook.id === activeNotebookId,
  );
  const activeCourse = courses.find(
    (course) => course.id === activeNotebook?.course_id,
  );
  const disabled = busy || loading || !!loadError;
  const firstName = displayName.trim().split(/\s+/)[0] || "Student";

  function updateRoute(href: string) {
    if (`${window.location.pathname}${window.location.search}` !== href) {
      router.push(href, { scroll: false });
    }
  }

  function focusHeading() {
    requestAnimationFrame(() =>
      document.getElementById("library-title")?.focus(),
    );
  }

  function openLibrary(nextCourseId = "") {
    setActiveNotebookId("");
    setCourseId(nextCourseId);
    setView("notebooks");
    updateRoute(
      libraryHref({ view: "notebooks", courseId: nextCourseId || undefined }),
    );
    focusHeading();
  }

  function openNotebook(notebookId: string) {
    setActiveNotebookId(notebookId);
    setCourseId("");
    setView("notebook");
    updateRoute(libraryHref({ view: "notebook", notebookId }));
    focusHeading();
  }

  function openImport(notebookId = "") {
    const targetNotebookId =
      !isUploading && notebookId ? notebookId : importNotebookId;
    if (!isUploading && notebookId) setImportNotebookId(notebookId);
    setActiveNotebookId("");
    setCourseId("");
    setImportMounted(true);
    setView("import");
    updateRoute(
      libraryHref({
        view: "import",
        targetNotebookId: targetNotebookId || undefined,
      }),
    );
    focusHeading();
  }

  function openDialog(next: Dialog) {
    setFormError(null);
    setDialog(next);
  }

  function newNotebook() {
    openDialog({
      type: "notebook",
      courseId: courses.some((course) => course.id === courseId)
        ? courseId
        : "",
    });
  }

  function refresh() {
    setLoading(true);
    setLoadError(null);
    setLoadVersion((current) => current + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || mutationLock.current) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!dialog.type.startsWith("archive") && !name) {
      setFormError("Enter a name that is not just spaces.");
      return;
    }

    const color = data.get("coverColor");
    if (
      (dialog.type === "notebook" || dialog.type === "editNotebook") &&
      !isCoverColor(color)
    ) {
      setFormError("Choose a cover color.");
      return;
    }
    dataEpoch.current += 1;
    mutationLock.current = true;
    setBusy(true);
    setFormError(null);
    try {
      if (dialog.type === "course") {
        const courseColor = data.get("courseColor");
        if (!isCoverColor(courseColor))
          throw new Error("Choose a course color.");
        const created = await createCourse({ name, color: courseColor });
        setCourses((current) => [
          created,
          ...current.filter((item) => item.id !== created.id),
        ]);
        openLibrary(created.id);
      } else if (dialog.type === "notebook") {
        const created = await createNotebook({
          title: name,
          coverColor: isCoverColor(color) ? color : "sage",
          courseId: String(data.get("courseId") ?? "") || null,
        });
        setNotebooks((current) => [
          created,
          ...current.filter((item) => item.id !== created.id),
        ]);
        openNotebook(created.id);
      } else if (dialog.type === "editNotebook") {
        const updated = await updateNotebook(dialog.item.id, {
          title: name,
          coverColor: isCoverColor(color) ? color : "sage",
          courseId: String(data.get("courseId") ?? "") || null,
        });
        setNotebooks((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else if (dialog.type === "editCourse") {
        const courseColor = data.get("courseColor");
        if (!isCoverColor(courseColor))
          throw new Error("Choose a course color.");
        const updated = await updateCourse(dialog.item.id, {
          name,
          color: courseColor,
        });
        setCourses((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else if (dialog.type === "archiveCourse") {
        await archiveCourse(dialog.item.id);
        setCourses((current) =>
          current.filter((item) => item.id !== dialog.item.id),
        );
        if (courseId === dialog.item.id) setCourseId("");
      } else if (dialog.type === "archiveNotebook") {
        await archiveNotebook(dialog.item.id);
        setNotebooks((current) =>
          current.filter((item) => item.id !== dialog.item.id),
        );
        setImportNotebookId((current) =>
          current === dialog.item.id ? "" : current,
        );
        if (activeNotebookId === dialog.item.id) {
          openLibrary();
        }
      }
      setDialog(null);
    } catch (error) {
      setFormError(message(error));
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }

  const heading =
    view === "import"
      ? "Import files"
      : view === "notebook"
        ? (activeNotebook?.title ?? "Notebook unavailable")
        : (selectedCourse?.name ??
          (courseId === "uncategorized"
            ? "Unfiled notebooks"
            : "Your library"));
  const subtitle =
    view === "import"
      ? "Add sources to a notebook. Your original files stay unchanged."
      : view === "notebook"
        ? (activeCourse?.name ?? "No course")
        : selectedCourse
          ? "Your notebooks for this course. Everything in one place."
          : courseId === "uncategorized"
            ? "Notebooks that are not assigned to a course."
            : `Welcome back, ${firstName}. Pick up where your curiosity left off.`;
  const archiveDialog =
    dialog?.type === "archiveCourse" || dialog?.type === "archiveNotebook";
  const notebookDialog =
    dialog?.type === "notebook" || dialog?.type === "editNotebook";
  const editing =
    dialog?.type === "editNotebook" || dialog?.type === "editCourse";
  const dialogTitle =
    dialog?.type === "course"
      ? "New course"
      : dialog?.type === "notebook"
        ? "New notebook"
        : dialog?.type === "editNotebook"
          ? "Edit notebook"
          : dialog?.type === "editCourse"
            ? "Edit course"
            : dialog?.type === "archiveCourse"
              ? "Archive course?"
              : "Archive notebook?";

  return (
    <div className={styles.page} data-view={view}>
      <a className="skip-link" href="#library-content">
        Skip to content
      </a>
      <aside className={styles.sidebar}>
        <button
          className={styles.brand}
          type="button"
          onClick={() => openLibrary()}
          aria-label="Coilora library"
        >
          <span className={styles.brandMark}>
            <Image
              src="/brand/coilora-mark.png"
              width={100}
              height={100}
              alt=""
              priority
            />
          </span>
          <span>Coilora</span>
        </button>
        <p className={styles.sectionLabel}>Personal workspace</p>
        <nav className={styles.navigation} aria-label="Workspace navigation">
          <button
            type="button"
            aria-current={
              view === "notebooks" && !courseId ? "page" : undefined
            }
            onClick={() => openLibrary()}
          >
            <LibraryIcon />
            <span>All notebooks</span>
          </button>
          <button
            type="button"
            aria-current={view === "import" ? "page" : undefined}
            onClick={() => openImport()}
          >
            <UploadIcon />
            <span>Import files</span>
            {isUploading ? (
              <span
                className={styles.uploadDot}
                aria-label="Upload in progress"
              />
            ) : null}
          </button>
        </nav>

        <nav className={styles.courseShortcuts} aria-label="Your courses">
          <p className={styles.sectionLabel}>Your courses</p>
          <div className={styles.courseList}>
            {courses.map((course) => (
              <button
                key={course.id}
                type="button"
                aria-pressed={
                  (view === "notebooks" && courseId === course.id) ||
                  (view === "notebook" &&
                    activeNotebook?.course_id === course.id)
                }
                onClick={() => openLibrary(course.id)}
              >
                <span
                  className={styles.courseDot}
                  style={{
                    backgroundColor: courseAccentColors[course.accent_color],
                  }}
                  aria-hidden="true"
                />
                <span>{course.name}</span>
              </button>
            ))}
          </div>
          <button
            className={styles.newCourse}
            type="button"
            disabled={disabled}
            onClick={() => openDialog({ type: "course" })}
          >
            <span aria-hidden="true">+</span> New course
          </button>
        </nav>
        <div className={styles.account}>
          <span className={styles.privacy}>
            <LockIcon />
            Private workspace
          </span>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{displayName}</strong>
              <span>Personal account</span>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="Sign out"
                title={
                  isUploading
                    ? "Wait for uploads to finish before signing out"
                    : "Sign out"
                }
                disabled={isUploading}
              >
                <LogOutIcon />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className={styles.main} id="library-content">
        <div className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button type="button" onClick={() => openLibrary()}>
              Library
            </button>
            {(view === "notebook" ? activeCourse : selectedCourse) ? (
              <>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={() => {
                    openLibrary(
                      (view === "notebook" ? activeCourse : selectedCourse)
                        ?.id ?? "",
                    );
                  }}
                >
                  {(view === "notebook" ? activeCourse : selectedCourse)?.name}
                </button>
              </>
            ) : null}
            {view === "notebook" || view === "import" ? (
              <>
                <span aria-hidden="true">/</span>
                <span>{view === "notebook" ? "Notebook" : "Import files"}</span>
              </>
            ) : null}
          </div>
          {view === "notebooks" ? (
            <button
              className={styles.secondary}
              type="button"
              onClick={() => openImport()}
            >
              <UploadIcon />
              Import files
            </button>
          ) : view === "import" ? (
            <span className={styles.topHint}>
              {isUploading
                ? "Uploading. Keep this tab open."
                : "PDF, images, text & Markdown"}
            </span>
          ) : null}
        </div>
        <div className={styles.content}>
          <header
            className={[
              styles.heading,
              view === "notebook" && activeNotebook
                ? styles.notebookHeading
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-color={
              view === "notebook" ? activeNotebook?.cover_color : undefined
            }
          >
            <div className={styles.headingIdentity}>
              {view === "notebook" && activeNotebook ? (
                <div className={styles.headingCover}>
                  <NotebookCover
                    title={activeNotebook.title}
                    color={activeNotebook.cover_color}
                    compact
                  />
                </div>
              ) : null}

              <div className={styles.headingCopy}>
                <h1 id="library-title" tabIndex={-1}>
                  {heading}
                </h1>

                <p className={styles.notebookCourse}>{subtitle}</p>
              </div>
            </div>

            <div className={styles.headingActions}>
              {view === "notebooks" ? (
                <>
                  {selectedCourse ? (
                    <details className={styles.actionsMenu}>
                      <summary aria-label="Course options">•••</summary>
                      <div>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={(event) => {
                            event.currentTarget
                              .closest("details")
                              ?.removeAttribute("open");
                            openDialog({
                              type: "editCourse",
                              item: selectedCourse,
                            });
                          }}
                        >
                          <PenIcon /> Edit course
                        </button>
                        <button
                          type="button"
                          disabled={
                            disabled ||
                            isUploading ||
                            notebooks.some(
                              (notebook) =>
                                notebook.course_id === selectedCourse.id,
                            )
                          }
                          onClick={() =>
                            openDialog({
                              type: "archiveCourse",
                              item: selectedCourse,
                            })
                          }
                        >
                          <ArchiveIcon /> Archive course
                        </button>
                        {notebooks.some(
                          (notebook) =>
                            notebook.course_id === selectedCourse.id,
                        ) ? (
                          <p>Archive the notebooks in this course first.</p>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                  <button
                    className={styles.primary}
                    type="button"
                    disabled={disabled}
                    onClick={newNotebook}
                  >
                    <span aria-hidden="true">+</span>New notebook
                  </button>
                </>
              ) : view === "notebook" && activeNotebook ? (
                <>
                  <details className={styles.actionsMenu}>
                    <summary aria-label="Notebook options">•••</summary>
                    <div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          openDialog({
                            type: "editNotebook",
                            item: activeNotebook,
                          });
                        }}
                      >
                        <PenIcon /> Edit notebook
                      </button>
                      <button
                        type="button"
                        disabled={disabled || isUploading}
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          openDialog({
                            type: "archiveNotebook",
                            item: activeNotebook,
                          });
                        }}
                      >
                        <ArchiveIcon /> Archive notebook
                      </button>
                      {isUploading ? (
                        <p>Wait for uploads to finish before archiving.</p>
                      ) : null}
                    </div>
                  </details>
                  <button
                    className={styles.primary}
                    type="button"
                    disabled={disabled}
                    onClick={() => openImport(activeNotebook.id)}
                  >
                    <UploadIcon />
                    {isUploading ? "View upload" : "Add files"}
                  </button>
                </>
              ) : null}
            </div>
          </header>

          {loadError ? (
            <div className={styles.error}>
              <p role="alert">{loadError}</p>
              <button
                className={styles.secondary}
                type="button"
                onClick={refresh}
              >
                Try again
              </button>
            </div>
          ) : null}
          {loading ? (
            <div className={styles.loading} role="status">
              <span className={styles.loadingMark} />
              Loading your library...
            </div>
          ) : null}

          <div hidden={view !== "notebooks" || loading || !!loadError}>
            <LibraryCollections
              notebooks={notebooks}
              courses={courses}
              courseId={courseId}
              onCourseChange={openLibrary}
              onOpen={(notebook) => openNotebook(notebook.id)}
              onCreate={newNotebook}
              onEdit={(notebook) =>
                openDialog({ type: "editNotebook", item: notebook })
              }
              editDisabled={disabled}
            />
          </div>

          {view === "notebook" && !loading && !loadError ? (
            activeNotebook ? (
              <div className={styles.notebookBody}>
                <NotebookPages
                  key={`${activeNotebook.id}:${documentsVersion}`}
                  notebookId={activeNotebook.id}
                />
                <div className={styles.documents}>
                  <SavedDocuments
                    key={`${activeNotebook.id}:${documentsVersion}`}
                    notebookId={activeNotebook.id}
                    notebookTitle={activeNotebook.title}
                    notebooks={notebooks}
                    onMoved={() =>
                      setDocumentsVersion((current) => current + 1)
                    }
                    openInNewTab={isUploading}
                  />
                </div>
              </div>
            ) : (
              <div className={styles.empty}>
                <p>This notebook is no longer in your active library.</p>
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => openLibrary()}
                >
                  Back to notebooks
                </button>
              </div>
            )
          ) : null}

          {importMounted ? (
            <div className={styles.importArea} hidden={view !== "import"}>
              <MaterialImport
                notebooks={notebooks}
                notebookId={importNotebookId}
                notebooksLoading={loading}
                notebookError={loadError}
                onNotebookChange={(notebookId) => {
                  setImportNotebookId(notebookId);
                  updateRoute(
                    libraryHref({
                      view: "import",
                      targetNotebookId: notebookId || undefined,
                    }),
                  );
                }}
                onRefreshNotebooks={refresh}
                onBusyChange={(uploading) => {
                  if (uploading) dataEpoch.current += 1;
                  setIsUploading(uploading);
                }}
                onUploaded={() => setDocumentsVersion((current) => current + 1)}
              />
            </div>
          ) : null}

          {view === "notebooks" ? (
            <footer className={styles.footer}>
              Your sources, in one place.
            </footer>
          ) : null}
        </div>
      </main>

      {dialog ? (
        <LibraryDialog
          title={dialogTitle}
          busy={busy}
          onClose={() => setDialog(null)}
        >
          <form
            className={styles.form}
            onSubmit={(event) => void submit(event)}
          >
            {archiveDialog ? (
              <p>
                Archive{" "}
                <strong>
                  {dialog.type === "archiveCourse"
                    ? dialog.item.name
                    : dialog.item.title}
                </strong>
                ? It will no longer appear in your active library. This
                interface does not offer a restore action yet.
              </p>
            ) : (
              <>
                {notebookDialog ? (
                  <NotebookAppearance
                    disabled={busy}
                    initialTitle={
                      dialog.type === "editNotebook" ? dialog.item.title : ""
                    }
                    initialColor={
                      dialog.type === "editNotebook"
                        ? dialog.item.cover_color
                        : "sage"
                    }
                  />
                ) : (
                  <>
                    <p>Group notebooks for a subject or class.</p>
                    <label htmlFor="collection-name">Course name</label>
                    <input
                      id="collection-name"
                      name="name"
                      required
                      maxLength={120}
                      defaultValue={
                        dialog.type === "editCourse" ? dialog.item.name : ""
                      }
                      placeholder="e.g. Human anatomy"
                      disabled={busy}
                    />
                    <CourseColorPicker
                      initialColor={
                        dialog.type === "editCourse"
                          ? dialog.item.accent_color
                          : "sage"
                      }
                      disabled={busy}
                    />
                  </>
                )}
                {dialog.type === "notebook" ||
                dialog.type === "editNotebook" ? (
                  <>
                    <label htmlFor="collection-course">
                      Course <span>(optional)</span>
                    </label>
                    <select
                      id="collection-course"
                      name="courseId"
                      defaultValue={
                        dialog.type === "editNotebook"
                          ? (dialog.item.course_id ?? "")
                          : dialog.courseId
                      }
                      disabled={busy}
                    >
                      <option value="">No course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </>
            )}
            {formError ? (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            ) : null}
            <div className={styles.dialogActions}>
              <button
                className={styles.secondary}
                type="button"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                className={archiveDialog ? styles.danger : styles.primary}
                type="submit"
                disabled={busy}
              >
                {busy
                  ? "Saving..."
                  : archiveDialog
                    ? "Archive"
                    : editing
                      ? "Save changes"
                      : dialog.type === "notebook"
                        ? "Create notebook"
                        : "Create course"}
              </button>
            </div>
          </form>
        </LibraryDialog>
      ) : null}
    </div>
  );
}
