import type { Course, Notebook } from "../../lib/api/types";

export type LibrarySort = "updated" | "title";

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
