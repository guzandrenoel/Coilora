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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPoint(value: unknown): value is AnnotationPoint {
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

function isKind(value: unknown): value is AnnotationKind {
  return (
    typeof value === "string" &&
    annotationKinds.some((kind) => kind === value)
  );
}

function isAnnotation(
  value: unknown,
  documentId: string,
  pageNumber: number,
): value is PageAnnotation {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    uuidPattern.test(value.id) &&
    value.notebook_page_id === null &&
    value.document_id === documentId &&
    value.document_page_number === pageNumber &&
    isKind(value.kind) &&
    Array.isArray(value.points) &&
    value.points.length >= 2 &&
    value.points.length <= 4096 &&
    value.points.every(isPoint) &&
    typeof value.color === "string" &&
    colorPattern.test(value.color) &&
    typeof value.width === "number" &&
    value.width >= 0.0005 &&
    value.width <= 0.1 &&
    typeof value.opacity === "number" &&
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

function validateTarget(documentId: string, pageNumber: number) {
  if (
    !uuidPattern.test(documentId) ||
    !Number.isSafeInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > 5000
  ) {
    throw new Error("Select a valid PDF page.");
  }
}

export async function getDocumentPageAnnotations(
  documentId: string,
  pageNumber: number,
  page = 0,
) {
  validateTarget(documentId, pageNumber);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000) {
    throw new Error("Select a valid annotation page.");
  }
  const body = await apiRequest(
    `/v1/documents/${encodeURIComponent(
      documentId,
    )}/pages/${pageNumber}/annotations?page=${page}`,
  );
  if (
    !isRecord(body) ||
    !Array.isArray(body.items) ||
    body.items.length > 200 ||
    !body.items.every((item) =>
      isAnnotation(item, documentId, pageNumber),
    ) ||
    (body.nextPage !== null && body.nextPage !== page + 1)
  ) {
    throw new Error("The API returned unexpected PDF annotations.");
  }
  return {
    items: body.items as PageAnnotation[],
    nextPage: body.nextPage as number | null,
  };
}

export async function createDocumentPageAnnotation(
  documentId: string,
  pageNumber: number,
  input: CreateAnnotationInput,
) {
  validateTarget(documentId, pageNumber);
  const body = await apiRequest(
    `/v1/documents/${encodeURIComponent(
      documentId,
    )}/pages/${pageNumber}/annotations`,
    { method: "POST", body: JSON.stringify(input) },
  );
  if (!isAnnotation(body, documentId, pageNumber)) {
    throw new Error("The API returned an unexpected PDF annotation.");
  }
  return body;
}

export async function deleteDocumentPageAnnotation(
  documentId: string,
  pageNumber: number,
  annotationId: string,
) {
  validateTarget(documentId, pageNumber);
  if (!uuidPattern.test(annotationId)) {
    throw new Error("Select a valid annotation.");
  }
  const body = await apiRequest(
    `/v1/documents/${encodeURIComponent(
      documentId,
    )}/pages/${pageNumber}/annotations/${encodeURIComponent(annotationId)}`,
    { method: "DELETE" },
  );
  if (!isRecord(body) || body.id !== annotationId || body.deleted !== true) {
    throw new Error("The API returned an unexpected deletion response.");
  }
}

export async function getDocumentBookmarks(documentId: string) {
  if (!uuidPattern.test(documentId)) {
    throw new Error("Select a valid document.");
  }
  const body = await apiRequest(
    `/v1/documents/${encodeURIComponent(documentId)}/annotations/bookmarks`,
  );
  if (
    !isRecord(body) ||
    !Array.isArray(body.pages) ||
    !body.pages.every(
      (page) =>
        typeof page === "number" &&
        Number.isSafeInteger(page) &&
        page >= 1 &&
        page <= 5000,
    )
  ) {
    throw new Error("The API returned unexpected PDF bookmarks.");
  }
  return body.pages as number[];
}

export async function setDocumentBookmark(
  documentId: string,
  pageNumber: number,
  bookmarked: boolean,
) {
  validateTarget(documentId, pageNumber);
  await apiRequest(
    `/v1/documents/${encodeURIComponent(
      documentId,
    )}/pages/${pageNumber}/bookmark`,
    { method: bookmarked ? "PUT" : "DELETE" },
  );
}
