export const coverColors = [
  "sage",
  "ocean",
  "lavender",
  "rose",
  "peach",
  "yellow",
  "slate",
] as const;
export type CoverColor = (typeof coverColors)[number];

export function isCoverColor(value: unknown): value is CoverColor {
  return (
    typeof value === "string" && coverColors.some((color) => color === value)
  );
}

export type Course = {
  id: string;
  name: string;
  accent_color: CoverColor;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Notebook = {
  id: string;
  course_id: string | null;
  cover_color: CoverColor;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseListResponse = {
  items: Course[];
};

export type NotebookListResponse = {
  items: Notebook[];
};

export type ArchiveResponse = {
  id: string;
  archived: true;
};

export type CreateCourseInput = {
  name: string;
  color?: CoverColor;
  description?: string;
};

export type CreateNotebookInput = {
  title: string;
  description?: string;
  courseId?: string | null;
  coverColor?: CoverColor;
};

export const paperStyles = [
  "blank",
  "dotted",
  "ruled",
  "grid",
  "cornell",
] as const;
export type PaperStyle = (typeof paperStyles)[number];

export type NotebookPage = {
  id: string;
  notebook_id: string;
  position: number;
  paper_style: PaperStyle;
  created_at: string;
  updated_at: string;
};
