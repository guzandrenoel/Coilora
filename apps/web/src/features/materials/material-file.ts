import type { CreateDocumentInput } from "@/lib/api/documents-client";

export const MAX_MATERIAL_SIZE_BYTES = 50 * 1024 * 1024;

export const MATERIAL_INPUT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.md";

export type MaterialKind = "PDF" | "Image" | "Transcript";

export type MaterialSelection = {
  id: string;
  file: File;
  kind: MaterialKind | "Unsupported";
  error: string | null;
};

type MaterialFormat = {
  kind: MaterialKind;
  sourceType: CreateDocumentInput["sourceType"];
  mediaType: string;
};

const formats = new Map<string, MaterialFormat>([
  ["pdf", { kind: "PDF", sourceType: "pdf", mediaType: "application/pdf" }],
  ["png", { kind: "Image", sourceType: "image", mediaType: "image/png" }],
  ["jpg", { kind: "Image", sourceType: "image", mediaType: "image/jpeg" }],
  ["jpeg", { kind: "Image", sourceType: "image", mediaType: "image/jpeg" }],
  ["webp", { kind: "Image", sourceType: "image", mediaType: "image/webp" }],
  ["txt", { kind: "Transcript", sourceType: "text", mediaType: "text/plain" }],
  ["md", { kind: "Transcript", sourceType: "markdown", mediaType: "text/markdown" }],
]);

function getFormat(filename: string) {
  const separator = filename.lastIndexOf(".");
  const extension =
    separator === -1 ? "" : filename.slice(separator + 1).toLowerCase();

  return formats.get(extension);
}

export function inspectMaterial(file: File): MaterialSelection {
  const format = getFormat(file.name);
  const filename = file.name.trim();
  let error: string | null = null;

  if (!format) {
    error = "Use a PDF, PNG, JPG, WEBP, TXT, or Markdown file.";
  } else if (
    filename.length === 0 ||
    filename.length > 255 ||
    /[/\\]/.test(filename)
  ) {
    error = "Use a filename of 1 to 255 characters without directory paths.";
  } else if (file.size === 0) {
    error = "This file is empty.";
  } else if (file.size > MAX_MATERIAL_SIZE_BYTES) {
    error = "This file exceeds the 50 MB limit.";
  }

  return {
    id: `${file.name}:${file.size}:${file.lastModified}`,
    file,
    kind: format?.kind ?? "Unsupported",
    error,
  };
}

export function getDocumentInput(file: File): CreateDocumentInput {
  const selection = inspectMaterial(file);
  const format = getFormat(file.name);

  if (selection.error || !format) {
    throw new Error(selection.error ?? "This file type is unsupported.");
  }

  const filename = file.name.trim();
  const title = filename.replace(/\.[^.]+$/, "").trim() || filename;

  return {
    title: title.slice(0, 200),
    originalFilename: filename,
    sourceType: format.sourceType,
    mediaType: format.mediaType,
    byteSize: file.size,
  };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}