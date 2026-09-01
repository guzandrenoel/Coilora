"use client";

import { apiRequest } from "./library-client";

export type DocumentReadSession = {
  documentId: string;
  notebookId: string;
  title: string;
  originalFilename: string;
  mediaType: "application/pdf";
  byteSize: number;
  revision: number;
  status: "uploaded";
  signedUrl: string;
  expiresIn: number;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maximumBytes = 52428800;

export async function createDocumentReadSession(
  documentId: string,
  signal: AbortSignal,
): Promise<DocumentReadSession> {
  if (!uuidPattern.test(documentId)) {
    throw new Error("Select a valid document from your library.");
  }

  const body = await apiRequest(
    `/v1/documents/${encodeURIComponent(documentId)}/read-session`,
    { method: "POST", signal },
  );

  if (typeof body !== "object" || body === null) {
    throw new Error("The API returned an unexpected PDF response.");
  }

  const value = body as Record<string, unknown>;
  if (
    value.documentId !== documentId ||
    typeof value.notebookId !== "string" ||
    !uuidPattern.test(value.notebookId) ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    value.title.length > 200 ||
    typeof value.originalFilename !== "string" ||
    !value.originalFilename.trim() ||
    value.originalFilename.length > 255 ||
    value.mediaType !== "application/pdf" ||
    value.status !== "uploaded" ||
    typeof value.byteSize !== "number" ||
    !Number.isSafeInteger(value.byteSize) ||
    value.byteSize < 1 ||
    value.byteSize > maximumBytes ||
    typeof value.revision !== "number" ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1 ||
    typeof value.expiresIn !== "number" ||
    !Number.isSafeInteger(value.expiresIn) ||
    value.expiresIn < 1 ||
    value.expiresIn > 300 ||
    typeof value.signedUrl !== "string"
  ) {
    throw new Error("The API returned an unexpected PDF response.");
  }

  try {
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    const url = new URL(value.signedUrl);
    const localHosts = ["localhost", "127.0.0.1", "[::1]"];
    const prefix = `${base.pathname.replace(/\/+$/, "")}/storage/v1/object/sign/documents/`;
    const parts = url.pathname.slice(prefix.length).split("/");

    if (
      url.origin !== base.origin ||
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && localHosts.includes(url.hostname))) ||
      url.username ||
      url.password ||
      url.hash ||
      !url.pathname.startsWith(prefix) ||
      parts.length !== 6 ||
      parts[0] !== "users" ||
      !uuidPattern.test(parts[1] ?? "") ||
      parts[2] !== "documents" ||
      parts[3] !== documentId ||
      parts[4] !== "source" ||
      parts[5] !== `v${value.revision}.pdf` ||
      !url.searchParams.get("token") ||
      url.searchParams.getAll("token").length !== 1
    ) {
      throw new Error("Unexpected storage location.");
    }
  } catch {
    throw new Error("The API returned an invalid private PDF link.");
  }

  return {
    documentId,
    notebookId: value.notebookId,
    title: value.title,
    originalFilename: value.originalFilename,
    mediaType: "application/pdf",
    byteSize: value.byteSize,
    revision: value.revision,
    status: "uploaded",
    signedUrl: value.signedUrl,
    expiresIn: value.expiresIn,
  };
}

export async function downloadDocumentPdf(
  session: DocumentReadSession,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const response = await fetch(session.signedUrl, {
    signal,
    credentials: "omit",
    referrerPolicy: "no-referrer",
    cache: "no-store",
    redirect: "error",
  }).catch(() => {
    throw new Error(
      "The PDF download failed. Check your connection and try again.",
    );
  });

  if (!response.ok || !response.body) {
    throw new Error(
      "The PDF link expired or the file is unavailable. Try again for a new link.",
    );
  }

  // Read once so page navigation does not depend on an expiring storage URL.
  const bytes = new Uint8Array(session.byteSize);
  const reader = response.body.getReader();
  let offset = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (offset + value.byteLength > bytes.byteLength) {
        throw new Error("The file exceeds its saved size.");
      }
      bytes.set(value, offset);
      offset += value.byteLength;
    }
    if (offset !== bytes.byteLength) {
      throw new Error("The file is incomplete.");
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    throw new Error(
      "The PDF download was interrupted or its size changed. Please try again.",
    );
  } finally {
    reader.releaseLock();
  }

  return bytes;
}
