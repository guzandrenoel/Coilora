export type Course = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Notebook = {
  id: string;
  course_id: string | null;
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

export type CreateCourseInput = {
  name: string;
  description?: string;
};

export type CreateNotebookInput = {
  title: string;
  description?: string;
  courseId?: string | null;
};