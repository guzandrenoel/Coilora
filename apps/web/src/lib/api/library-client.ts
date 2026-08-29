"use client";

import { createClient } from "@/lib/supabase/client";

import type {
  Course,
  CourseListResponse,
  CreateCourseInput,
  CreateNotebookInput,
  Notebook,
  NotebookListResponse,
} from "./types";

function getApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (!apiUrl) {
    throw new Error("The Coilora API URL is not configured.");
  }

  return apiUrl;
}

async function getAccessToken() {
  const supabase = createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error("A signed-in session is required.");
  }

  return session.access_token;
}

async function apiRequest(path: string, init?: RequestInit): Promise<unknown> {
  const accessToken = await getAccessToken();
  const headers = new Headers(init?.headers);

  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;

    const message = Array.isArray(body?.message)
      ? body.message[0]
      : body?.message;

    throw new Error(message || "The Coilora API request failed.");
  }

  return response.json();
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isCourse(value: unknown): value is Course {
  if (!value || typeof value !== "object") {
    return false;
  }

  const course = value as Record<string, unknown>;

  return (
    typeof course.id === "string" &&
    typeof course.name === "string" &&
    isNullableString(course.description) &&
    typeof course.created_at === "string" &&
    typeof course.updated_at === "string"
  );
}

function isNotebook(value: unknown): value is Notebook {
  if (!value || typeof value !== "object") {
    return false;
  }

  const notebook = value as Record<string, unknown>;

  return (
    typeof notebook.id === "string" &&
    isNullableString(notebook.course_id) &&
    typeof notebook.title === "string" &&
    isNullableString(notebook.description) &&
    typeof notebook.created_at === "string" &&
    typeof notebook.updated_at === "string"
  );
}

function isCourseListResponse(value: unknown): value is CourseListResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Record<string, unknown>;

  return Array.isArray(response.items) && response.items.every(isCourse);
}

function isNotebookListResponse(
  value: unknown,
): value is NotebookListResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Record<string, unknown>;

  return Array.isArray(response.items) && response.items.every(isNotebook);
}

export async function getCourses(): Promise<Course[]> {
  const body = await apiRequest("/v1/courses");

  if (!isCourseListResponse(body)) {
    throw new Error("The API returned an unexpected course response.");
  }

  return body.items;
}

export async function createCourse(
  input: CreateCourseInput,
): Promise<Course> {
  const body = await apiRequest("/v1/courses", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!isCourse(body)) {
    throw new Error("The API returned an unexpected course response.");
  }

  return body;
}

export async function getNotebooks(
  courseId?: string,
): Promise<Notebook[]> {
  const query = courseId
    ? `?courseId=${encodeURIComponent(courseId)}`
    : "";

  const body = await apiRequest(`/v1/notebooks${query}`);

  if (!isNotebookListResponse(body)) {
    throw new Error("The API returned an unexpected notebook response.");
  }

  return body.items;
}

export async function createNotebook(
  input: CreateNotebookInput,
): Promise<Notebook> {
  const body = await apiRequest("/v1/notebooks", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!isNotebook(body)) {
    throw new Error("The API returned an unexpected notebook response.");
  }

  return body;
}