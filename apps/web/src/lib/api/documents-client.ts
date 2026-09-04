"use client";

import { apiRequest } from "./library-client";

export type CreateDocumentInput = {
  title: string;
  originalFilename: string;
  sourceType: "pdf" | "image" | "text" | "markdown";
  mediaType: string;
  byteSize: number;
};

export type DocumentResponse = {
  id: string;
  status: "awaiting_upload" | "uploaded";
  revision: number;
};

export type DocumentUploadSession = {
  documentId: string;
  bucket: "documents";
  path: string;
  token: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readDocumentResponse(
  value: unknown,
  expectedStatus: DocumentResponse["status"],
): DocumentResponse {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !uuidPattern.test(value.id) ||
    value.status !== expectedStatus ||
    typeof value.revision !== "number" ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1
  ) {
    throw new Error("The API returned an unexpected document response.");
  }

  return {
    id: value.id,
    status: expectedStatus,
    revision: value.revision,
  };
}

export async function createDocument(
  notebookId: string,
  input: CreateDocumentInput,
): Promise<DocumentResponse> {
  const body = await apiRequest(
    `/v1/notebooks/${encodeURIComponent(notebookId)}/documents`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return readDocumentResponse(body, "awaiting_upload");
}

export async function createDocumentUploadSession(
  documentId: string,
): Promise<DocumentUploadSession> {
  const body = await apiRequest(
    `/v1/documents/${encodeURIComponent(documentId)}/upload-session`,
    { method: "POST" },
  );

  if (
    !isRecord(body) ||
    body.documentId !== documentId ||
    body.bucket !== "documents" ||
    typeof body.path !== "string" ||
    typeof body.token !== "string" ||
    body.token.trim().length === 0
  ) {
    throw new Error("The API returned an unexpected upload session.");
  }

  const parts = body.path.split("/");

  if (
    parts.length !== 6 ||
    parts[0] !== "users" ||
    !uuidPattern.test(parts[1] ?? "") ||
    parts[2] !== "documents" ||
    parts[3] !== documentId ||
    parts[4] !== "source" ||
    !/^v[1-9]\d*\.(pdf|png|jpg|webp|txt|md)$/.test(parts[5] ?? "")
  ) {
    throw new Error("The API returned an unexpected upload path.");
  }

  return {
    documentId,
    bucket: "documents",
    path: body.path,
    token: body.token,
  };
}

export async function uploadDocumentFile(
  session: DocumentUploadSession,
  file: File,
  mediaType: string,
  onProgress?: (percentage: number | null) => void,
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("The storage URL is not configured.");
  }

  const path = session.path.split("/").map(encodeURIComponent).join("/");
  const url = new URL(
    `${baseUrl}/storage/v1/object/upload/sign/${session.bucket}/${path}`,
  );
  url.searchParams.set("token", session.token);

  const uploadFile = new File([file], file.name, {
    type: mediaType,
    lastModified: file.lastModified,
  });

  const body = new FormData();
  body.append("cacheControl", "0");
  body.append("", uploadFile);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastProgress: number | null | undefined;

    function reportProgress(value: number | null) {
      if (value !== lastProgress) {
        lastProgress = value;
        onProgress?.(value);
      }
    }

    function fail(message: string) {
      reject(new Error(message));
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        reportProgress(null);
        return;
      }

      reportProgress(
        Math.min(
          100,
          Math.max(0, Math.floor((event.loaded / event.total) * 100)),
        ),
      );
    };

    xhr.onload = () => {
      const response: unknown = xhr.response;

      if (
        xhr.status < 200 ||
        xhr.status >= 300 ||
        !isRecord(response) ||
        response.Key !== `${session.bucket}/${session.path}`
      ) {
        fail("Storage could not confirm the upload. Please retry.");
        return;
      }

      reportProgress(100);
      resolve();
    };

    xhr.onerror = () => fail("The upload connection failed. Please retry.");

    xhr.ontimeout = () => fail("The upload timed out. Please retry.");

    xhr.onabort = () => fail("The upload was interrupted. Please retry.");

    try {
      xhr.open("PUT", url.toString());
      xhr.responseType = "json";
      xhr.timeout = 10 * 60 * 1000;
      xhr.setRequestHeader("x-upsert", "false");

      reportProgress(0);
      xhr.send(body);
    } catch {
      fail("The upload could not be started. Please retry.");
    }
  });
}

export async function completeDocumentUpload(
  documentId: string,
): Promise<DocumentResponse> {
  const body = await apiRequest(
    `/v1/documents/${encodeURIComponent(documentId)}/upload-complete`,
    { method: "POST" },
  );

  const document = readDocumentResponse(body, "uploaded");

  if (document.id !== documentId) {
    throw new Error("The API returned a different document.");
  }

  return document;
}

const savedDocumentStatuses = [
  "uploaded",
  "validating",
  "quarantined",
  "extracting",
  "ocr_required",
  "indexing",
  "ready",
  "failed",
] as const;

export type SavedDocument = {
  id: string;
  notebook_id: string;
  title: string;
  original_filename: string;
  source_type: string;
  byte_size: number;
  status: (typeof savedDocumentStatuses)[number];
  page_count: number | null;
  bookmarked: boolean;
  revision: number;
  created_at: string;
};

function isSavedDocument(value: unknown): value is SavedDocument {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    uuidPattern.test(value.id) &&
    typeof value.notebook_id === "string" &&
    uuidPattern.test(value.notebook_id) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.original_filename === "string" &&
    value.original_filename.trim().length > 0 &&
    typeof value.source_type === "string" &&
    ["pdf", "image", "text", "markdown"].includes(value.source_type) &&
    typeof value.byte_size === "number" &&
    Number.isSafeInteger(value.byte_size) &&
    value.byte_size > 0 &&
    value.byte_size <= 52428800 &&
    typeof value.bookmarked === "boolean" &&
    typeof value.revision === "number" &&
    Number.isSafeInteger(value.revision) &&
    value.revision >= 1 &&
    typeof value.status === "string" &&
    savedDocumentStatuses.some((status) => status === value.status) &&
    (value.page_count === null ||
      (typeof value.page_count === "number" &&
        Number.isSafeInteger(value.page_count) &&
        value.page_count >= 1 &&
        value.page_count <= 5000)) &&
    typeof value.created_at === "string" &&
    Number.isFinite(Date.parse(value.created_at))
  );
}

export async function getSavedDocuments(
  notebookId: string,
  page = 0,
): Promise<{ items: SavedDocument[]; nextPage: number | null }> {
  if (
    !uuidPattern.test(notebookId) ||
    !Number.isSafeInteger(page) ||
    page < 0 ||
    page > 10000
  ) {
    throw new Error("Select a valid notebook and document page.");
  }

  const body = await apiRequest(
    `/v1/notebooks/${encodeURIComponent(notebookId)}/documents?page=${page}`,
  );

  if (
    !isRecord(body) ||
    !Array.isArray(body.items) ||
    body.items.length > 20 ||
    (body.nextPage !== null &&
      (typeof body.nextPage !== "number" || body.nextPage !== page + 1))
  ) {
    throw new Error("The API returned an unexpected document list.");
  }

  const items = body.items.map((item: unknown) => {
    if (!isSavedDocument(item) || item.notebook_id !== notebookId) {
      throw new Error("The API returned an unexpected saved document.");
    }

    return item;
  });

  return { items, nextPage: body.nextPage };
}

export async function moveSavedDocument(
  sourceNotebookId: string,
  documentId: string,
  destinationNotebookId: string,
): Promise<SavedDocument> {
  if (
    !uuidPattern.test(sourceNotebookId) ||
    !uuidPattern.test(documentId) ||
    !uuidPattern.test(destinationNotebookId)
  ) {
    throw new Error("Select a valid document and destination notebook.");
  }

  const body = await apiRequest(
    `/v1/notebooks/${encodeURIComponent(sourceNotebookId)}/documents/${encodeURIComponent(documentId)}/move`,
    {
      method: "PATCH",
      body: JSON.stringify({ destinationNotebookId }),
    },
  );

  if (
    !isSavedDocument(body) ||
    body.id !== documentId ||
    body.notebook_id !== destinationNotebookId
  ) {
    throw new Error("The API returned an unexpected document move.");
  }

  return body;
}

export async function setSavedDocumentBookmark(
  notebookId: string,
  documentId: string,
  bookmarked: boolean,
): Promise<boolean> {
  if (!uuidPattern.test(notebookId) || !uuidPattern.test(documentId)) {
    throw new Error("Select a valid document.");
  }
  const body = await apiRequest(
    `/v1/notebooks/${encodeURIComponent(notebookId)}/documents/${encodeURIComponent(documentId)}/bookmark`,
    { method: "PATCH", body: JSON.stringify({ bookmarked }) },
  );
  if (
    !isRecord(body) ||
    body.id !== documentId ||
    typeof body.bookmarked !== "boolean"
  ) {
    throw new Error("The API returned an unexpected document bookmark.");
  }
  return body.bookmarked;
}
