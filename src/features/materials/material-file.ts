export const MAX_MATERIAL_SIZE_BYTES = 50 * 1024 * 1024;

export const MATERIAL_INPUT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.md";

export type MaterialKind = "PDF" | "Image" | "Transcript";

export type MaterialSelection = {
  id: string;
  file: File;
  kind: MaterialKind | "Unsupported";
  error: string | null;
};

const extensionKinds: Readonly<Record<string, MaterialKind | undefined>> = {
  pdf: "PDF",
  png: "Image",
  jpg: "Image",
  jpeg: "Image",
  webp: "Image",
  txt: "Transcript",
  md: "Transcript",
};

function getExtension(filename: string) {
  const separatorIndex = filename.lastIndexOf(".");
  return separatorIndex === -1 ? "" : filename.slice(separatorIndex + 1).toLowerCase();
}

export function inspectMaterial(file: File): MaterialSelection {
  const kind = extensionKinds[getExtension(file.name)] ?? "Unsupported";
  let error: string | null = null;

  if (kind === "Unsupported") {
    error = "Use a PDF, PNG, JPG, WEBP, TXT, or Markdown file.";
  } else if (file.size === 0) {
    error = "This file is empty.";
  } else if (file.size > MAX_MATERIAL_SIZE_BYTES) {
    error = "This file exceeds the current 50 MB selection limit.";
  }

  return {
    id: `${file.name}:${file.size}:${file.lastModified}`,
    file,
    kind,
    error,
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
