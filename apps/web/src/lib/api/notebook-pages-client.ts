"use client";

import { apiRequest } from "./library-client";
import { paperStyles, type NotebookPage, type PaperStyle } from "./types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPaperStyle(value: unknown): value is PaperStyle {
  return (
    typeof value === "string" &&
    paperStyles.some((paperStyle) => paperStyle === value)
  );
}

function isNotebookPage(value: unknown): value is NotebookPage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    uuidPattern.test(value.id) &&
    typeof value.notebook_id === "string" &&
    uuidPattern.test(value.notebook_id) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    value.title.length <= 120 &&
    typeof value.position === "number" &&
    Number.isSafeInteger(value.position) &&
    value.position > 0 &&
    isPaperStyle(value.paper_style) &&
    (value.document_id === null ||
      (typeof value.document_id === "string" &&
        uuidPattern.test(value.document_id))) &&
    (value.after_document_page_number === null ||
      (typeof value.after_document_page_number === "number" &&
        Number.isSafeInteger(value.after_document_page_number) &&
        value.after_document_page_number >= 0 &&
        value.after_document_page_number <= 5000)) &&
    ((value.document_id === null &&
      value.after_document_page_number === null) ||
      (value.document_id !== null &&
        value.after_document_page_number !== null)) &&
    typeof value.bookmarked === "boolean" &&
    typeof value.created_at === "string" &&
    Number.isFinite(Date.parse(value.created_at)) &&
    typeof value.updated_at === "string" &&
    Number.isFinite(Date.parse(value.updated_at))
  );
}

export async function getNotebookPages(
  notebookId: string,
  page = 0,
): Promise<{ items: NotebookPage[]; nextPage: number | null }> {
  if (
    !uuidPattern.test(notebookId) ||
    !Number.isSafeInteger(page) ||
    page < 0 ||
    page > 10000
  ) {
    throw new Error("Select a valid notebook and page.");
  }

  const body = await apiRequest(
    `/v1/notebooks/${encodeURIComponent(notebookId)}/pages?page=${page}`,
  );
  if (
    !isRecord(body) ||
    !Array.isArray(body.items) ||
    body.items.length > 50 ||
    !body.items.every(
      (item) => isNotebookPage(item) && item.notebook_id === notebookId,
    ) ||
    (body.nextPage !== null && body.nextPage !== page + 1)
  ) {
    throw new Error("The API returned an unexpected notebook page response.");
  }
  return { items: body.items, nextPage: body.nextPage as number | null };
}

export async function getNotebookPage(
  notebookId: string,
  pageId: string,
): Promise<NotebookPage> {
  if (!uuidPattern.test(notebookId) || !uuidPattern.test(pageId)) {
    throw new Error("Select a valid notebook page.");
  }

  const body = await apiRequest(
    `/v1/notebooks/${encodeURIComponent(notebookId)}/pages/${encodeURIComponent(pageId)}`,
  );

  if (
    !isNotebookPage(body) ||
    body.notebook_id !== notebookId ||
    body.id !== pageId
  ) {
    throw new Error("The API returned an unexpected notebook page response.");
  }

  return body;
}

export async function createNotebookPage(
  notebookId: string,
  title: string,
  paperStyle: PaperStyle,
  placement?: {
    documentId: string;
    afterDocumentPageNumber: number;
  },
): Promise<NotebookPage> {
  const cleanTitle = title.trim();
  if (
    !uuidPattern.test(notebookId) ||
    !cleanTitle ||
    cleanTitle.length > 120 ||
    !isPaperStyle(paperStyle) ||
    (placement !== undefined &&
      (!uuidPattern.test(placement.documentId) ||
        !Number.isSafeInteger(placement.afterDocumentPageNumber) ||
        placement.afterDocumentPageNumber < 0 ||
        placement.afterDocumentPageNumber > 5000))
  ) {
    throw new Error("Choose a valid notebook and paper style.");
  }
  const body = await apiRequest(
    `/v1/notebooks/${encodeURIComponent(notebookId)}/pages`,
    {
      method: "POST",
      body: JSON.stringify({
        title: cleanTitle,
        paperStyle,
        documentId: placement?.documentId ?? null,
        afterDocumentPageNumber:
          placement?.afterDocumentPageNumber ?? null,
      }),
    },
  );
  if (!isNotebookPage(body) || body.notebook_id !== notebookId) {
    throw new Error("The API returned an unexpected notebook page response.");
  }
  return body;
}

export async function updateNotebookPage(
  notebookId: string,
  pageId: string,
  input: { title?: string; bookmarked?: boolean },
): Promise<NotebookPage> {
  const title = input.title?.trim();
  if (
    !uuidPattern.test(notebookId) ||
    !uuidPattern.test(pageId) ||
    (title !== undefined && (!title || title.length > 120)) ||
    (input.bookmarked !== undefined &&
      typeof input.bookmarked !== "boolean") ||
    (title === undefined && input.bookmarked === undefined)
  ) {
    throw new Error("Choose a valid page change.");
  }

  const body = await apiRequest(
    `/v1/notebooks/${encodeURIComponent(
      notebookId,
    )}/pages/${encodeURIComponent(pageId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        ...(title === undefined ? {} : { title }),
        ...(input.bookmarked === undefined
          ? {}
          : { bookmarked: input.bookmarked }),
      }),
    },
  );

  if (
    !isNotebookPage(body) ||
    body.notebook_id !== notebookId ||
    body.id !== pageId
  ) {
    throw new Error("The API returned an unexpected notebook page response.");
  }
  return body;
}
