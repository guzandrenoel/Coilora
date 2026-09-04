import type { Course, Notebook } from "../../lib/api/types";

export type LibrarySort = "updated" | "title";

export type LibraryRoute =
  | { view: "notebooks"; courseId?: string }
  | { view: "notebook"; notebookId: string }
  | { view: "import"; targetNotebookId?: string };

export function isLibraryId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function libraryHref(route: LibraryRoute = { view: "notebooks" }) {
  if (route.view === "notebook") {
    return `/library?notebook=${encodeURIComponent(route.notebookId)}`;
  }

  if (route.view === "import") {
    const target = route.targetNotebookId
      ? `&target=${encodeURIComponent(route.targetNotebookId)}`
      : "";
    return `/library?view=import${target}`;
  }

  return route.courseId
    ? `/library?course=${encodeURIComponent(route.courseId)}`
    : "/library";
}

export function visibleNotebooks(
  notebooks: Notebook[],
  courses: Course[],
  query: string,
  courseId: string,
  sort: LibrarySort,
) {
  const names = new Map(courses.map((course) => [course.id, course.name]));
  const search = query.trim().toLocaleLowerCase();
  return notebooks
    .filter((notebook) => {
      const inCourse =
        !courseId ||
        (courseId === "uncategorized"
          ? notebook.course_id === null
          : notebook.course_id === courseId);
      const text = [
        notebook.title,
        notebook.description ?? "",
        names.get(notebook.course_id ?? "") ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase();
      return inCourse && (!search || text.includes(search));
    })
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
        : (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0) ||
          a.title.localeCompare(b.title) ||
          a.id.localeCompare(b.id),
    );
}
