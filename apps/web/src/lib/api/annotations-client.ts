"use client";

import { apiRequest } from "./library-client";
import {
  annotationKinds,
  type AnnotationKind,
  type AnnotationPoint,
  type CreateAnnotationInput,
  type PageAnnotation,
} from "./types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const colorPattern = /^#[0-9a-f]{6}$/i;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnnotationKind(
  value: unknown,
): value is AnnotationKind {
  return (
    typeof value === "string" &&
    annotationKinds.some((kind) => kind === value)
  );
}

function isAnnotationPoint(
  value: unknown,
): value is AnnotationPoint {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    value.x >= 0 &&
    value.x <= 1 &&
    typeof value.y === "number" &&
    Number.isFinite(value.y) &&
    value.y >= 0 &&
    value.y <= 1
  );
}

function isPageAnnotation(
  value: unknown,
  pageId: string,
): value is PageAnnotation {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    uuidPattern.test(value.id) &&
    value.notebook_page_id === pageId &&
    value.document_id === null &&
    value.document_page_number === null &&
    isAnnotationKind(value.kind) &&
    Array.isArray(value.points) &&
    value.points.length >= 2 &&
    value.points.length <= 4096 &&
    value.points.every(isAnnotationPoint) &&
    typeof value.color === "string" &&
    colorPattern.test(value.color) &&
    typeof value.width === "number" &&
    Number.isFinite(value.width) &&
    value.width >= 0.0005 &&
    value.width <= 0.1 &&
    typeof value.opacity === "number" &&
    Number.isFinite(value.opacity) &&
    value.opacity >= 0 &&
    value.opacity <= 1 &&
    typeof value.z_index === "number" &&
    Number.isSafeInteger(value.z_index) &&
    value.z_index > 0 &&
    typeof value.revision === "number" &&
    Number.isSafeInteger(value.revision) &&
    value.revision > 0 &&
    typeof value.created_at === "string" &&
    Number.isFinite(Date.parse(value.created_at)) &&
    typeof value.updated_at === "string" &&
    Number.isFinite(Date.parse(value.updated_at))
  );
}

function isCreateInput(
  value: CreateAnnotationInput,
): boolean {
  return (
    isAnnotationKind(value.kind) &&
    Array.isArray(value.points) &&
    value.points.length >= 2 &&
    value.points.length <= 4096 &&
    value.points.every(isAnnotationPoint) &&
    colorPattern.test(value.color) &&
    Number.isFinite(value.width) &&
    value.width >= 0.0005 &&
    value.width <= 0.1 &&
    Number.isFinite(value.opacity) &&
    value.opacity >= 0 &&
    value.opacity <= 1
  );
}

export async function getPageAnnotations(
  notebookId: string,
  pageId: string,
  page = 0,
): Promise<{
  items: PageAnnotation[];
  nextPage: number | null;
}> {
  if (
    !uuidPattern.test(notebookId) ||
    !uuidPattern.test(pageId) ||
    !Number.isSafeInteger(page) ||
    page < 0 ||
    page > 10000
  ) {
    throw new Error(
      "Select a valid notebook page and annotation page.",
    );
  }

  const body = await apiRequest(
    `/v1/notebooks/${encodeURIComponent(
      notebookId,
    )}/pages/${encodeURIComponent(
      pageId,
    )}/annotations?page=${page}`,
  );

  if (
    !isRecord(body) ||
    !Array.isArray(body.items) ||
    body.items.length > 200 ||
    !body.items.every((item) =>
      isPageAnnotation(item, pageId),
    ) ||
    (body.nextPage !== null &&
      body.nextPage !== page + 1)
  ) {
    throw new Error(
      "The API returned an unexpected annotation response.",
    );
  }

  return {
    items: body.items,
    nextPage: body.nextPage as number | null,
  };
}

export async function createPageAnnotation(
  notebookId: string,
  pageId: string,
  input: CreateAnnotationInput,
): Promise<PageAnnotation> {
  if (
    !uuidPattern.test(notebookId) ||
    !uuidPattern.test(pageId) ||
    !isCreateInput(input)
  ) {
    throw new Error("Choose a valid annotation.");
  }

  const body = await apiRequest(
    `/v1/notebooks/${encodeURIComponent(
      notebookId,
    )}/pages/${encodeURIComponent(
      pageId,
    )}/annotations`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  if (!isPageAnnotation(body, pageId)) {
    throw new Error(
      "The API returned an unexpected annotation response.",
    );
  }

  return body;
}

export async function deletePageAnnotation(
  notebookId: string,
  pageId: string,
  annotationId: string,
): Promise<{ id: string; deleted: true }> {
  if (
    !uuidPattern.test(notebookId) ||
    !uuidPattern.test(pageId) ||
    !uuidPattern.test(annotationId)
  ) {
    throw new Error("Select a valid annotation.");
  }

  const body = await apiRequest(
    `/v1/notebooks/${encodeURIComponent(
      notebookId,
    )}/pages/${encodeURIComponent(
      pageId,
    )}/annotations/${encodeURIComponent(annotationId)}`,
    {
      method: "DELETE",
    },
  );

  if (
    !isRecord(body) ||
    body.id !== annotationId ||
    body.deleted !== true
  ) {
    throw new Error(
      "The API returned an unexpected deletion response.",
    );
  }

  return {
    id: body.id,
    deleted: true,
  };
}