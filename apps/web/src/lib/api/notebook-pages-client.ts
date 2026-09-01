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
    typeof value.position === "number" &&
    Number.isSafeInteger(value.position) &&
    value.position > 0 &&
    isPaperStyle(value.paper_style) &&
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

export async function createNotebookPage(
  notebookId: string,
  paperStyle: PaperStyle,
): Promise<NotebookPage> {
  if (!uuidPattern.test(notebookId) || !isPaperStyle(paperStyle)) {
    throw new Error("Choose a valid notebook and paper style.");
  }
  const body = await apiRequest(
    `/v1/notebooks/${encodeURIComponent(notebookId)}/pages`,
    {
      method: "POST",
      body: JSON.stringify({ paperStyle }),
    },
  );
  if (!isNotebookPage(body) || body.notebook_id !== notebookId) {
    throw new Error("The API returned an unexpected notebook page response.");
  }
  return body;
}
