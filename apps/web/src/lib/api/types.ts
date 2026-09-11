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
  title: string;
  position: number;
  paper_style: PaperStyle;
  document_id: string | null;
  after_document_page_number: number | null;
  bookmarked: boolean;
  created_at: string;
  updated_at: string;
};

export const annotationKinds = ["ink", "pencil", "highlight", "text"] as const;

export type AnnotationKind = (typeof annotationKinds)[number];

export type AnnotationPoint = {
  x: number;
  y: number;
};

export type PageAnnotation = {
  id: string;
  notebook_page_id: string | null;
  document_id: string | null;
  document_page_number: number | null;
  kind: AnnotationKind;
  points: AnnotationPoint[];
  color: string;
  width: number;
  opacity: number;
  text_content: string | null;
  font_size: number | null;
  font_family:
    "modern" | "classic" | "rounded" | "typewriter" | "handwritten" | null;
  font_weight: 400 | 700 | null;
  font_style: "normal" | "italic" | null;
  text_align: "left" | "center" | "right" | null;
  z_index: number;
  revision: number;
  created_at: string;
  updated_at: string;
};

export type CreateAnnotationInput = {
  id?: string;
  kind: AnnotationKind;
  points: AnnotationPoint[];
  color: string;
  width: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  fontFamily?: "modern" | "classic" | "rounded" | "typewriter" | "handwritten";
  fontWeight?: 400 | 700;
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
};

export type UpdateAnnotationInput = {
  points: AnnotationPoint[];
  revision: number;
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: "modern" | "classic" | "rounded" | "typewriter" | "handwritten";
  fontWeight?: 400 | 700;
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
};
