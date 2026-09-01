"use client";
import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { FileIcon, UploadIcon } from "@/components/ui/icons";
import {
  completeDocumentUpload,
  createDocument,
  createDocumentUploadSession,
  uploadDocumentFile,
} from "@/lib/api/documents-client";
import type { Notebook } from "@/lib/api/types";

import {
  formatFileSize,
  getDocumentInput,
  inspectMaterial,
  MATERIAL_INPUT_ACCEPT,
  type MaterialSelection,
} from "./material-file";
import styles from "./material-import.module.css";

type UploadPhase =
  "selected" | "creating" | "uploading" | "verifying" | "uploaded" | "error";

type UploadTarget = Pick<Notebook, "id" | "title">;

type UploadItem = MaterialSelection & {
  phase: UploadPhase;
  documentId?: string;
  target?: UploadTarget;
  transferAttempted: boolean;
  transferSucceeded: boolean;
  uploadError: string | null;
  uploadProgress: number | null;
};

const phaseLabels: Record<UploadPhase, string> = {
  selected: "Ready to upload",
  creating: "Creating document...",
  uploading: "Uploading file...",
  verifying: "Verifying upload...",
  uploaded: "Uploaded",
  error: "Needs attention",
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

type MaterialImportProps = {
  notebooks: Notebook[];
  notebookId: string;
  notebooksLoading: boolean;
  notebookError: string | null;
  onNotebookChange: (id: string) => void;
  onRefreshNotebooks: () => void;
  onUploaded: () => void;
  onBusyChange: (busy: boolean) => void;
};

export function MaterialImport({
  notebooks,
  notebookId,
  notebooksLoading,
  notebookError,
  onNotebookChange,
  onRefreshNotebooks,
  onUploaded,
  onBusyChange,
}: MaterialImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);
  const mounted = useRef(false);

  const [materials, setMaterials] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isUploading) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) =>
      event.preventDefault();
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isUploading]);

  function addFiles(files: FileList | File[]) {
    if (uploadLock.current) return;

    const incoming = Array.from(files).map(inspectMaterial);

    setMaterials((current) => {
      const seen = new Set(current.map((material) => material.id));
      const additions: UploadItem[] = [];

      for (const material of incoming) {
        if (seen.has(material.id)) continue;

        seen.add(material.id);
        additions.push({
          ...material,
          phase: "selected",
          transferAttempted: false,
          transferSucceeded: false,
          uploadError: null,
          uploadProgress: null,
        });
      }

      return [...current, ...additions];
    });
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addFiles(event.target.files);
    }

    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  }

  function removeMaterial(id: string) {
    if (uploadLock.current) return;

    setMaterials((current) => current.filter((material) => material.id !== id));
  }

  async function uploadOne(initial: UploadItem, target: UploadTarget) {
    const destination = initial.target ?? target;
    let item: UploadItem = { ...initial, target: destination };

    function update(changes: Partial<UploadItem>) {
      const next = { ...item, ...changes };
      item = next;

      if (mounted.current) {
        setMaterials((current) =>
          current.map((entry) => (entry.id === next.id ? next : entry)),
        );

        if (changes.phase === "uploaded") {
          onUploaded();
        }
      }
    }

    try {
      const input = getDocumentInput(item.file);
      let documentId = item.documentId;

      update({ uploadError: null });

      if (documentId && item.transferAttempted) {
        update({ phase: "verifying" });

        try {
          await completeDocumentUpload(documentId);
          update({ phase: "uploaded" });
          return;
        } catch (error) {
          // A confirmed transfer only needs completion retried.
          if (item.transferSucceeded) throw error;
        }
      }

      if (!mounted.current) return;

      if (!documentId) {
        update({ phase: "creating" });

        const document = await createDocument(destination.id, input);
        documentId = document.id;

        update({ documentId });
      }

      if (!mounted.current) return;

      update({
        phase: "uploading",
        uploadProgress: 0,
      });

      const session = await createDocumentUploadSession(documentId);

      if (!mounted.current) return;

      update({ transferAttempted: true });

      await uploadDocumentFile(
        session,
        item.file,
        input.mediaType,
        (percentage) => {
          update({ uploadProgress: percentage });
        },
      );

      update({
        transferSucceeded: true,
        phase: "verifying",
      });

      await completeDocumentUpload(documentId);

      update({ phase: "uploaded" });
    } catch (error) {
      update({
        phase: "error",
        uploadError: errorMessage(error),
      });
    }
  }

  async function runUploads(items: UploadItem[], target: UploadTarget) {
    if (uploadLock.current || items.length === 0) return;

    uploadLock.current = true;
    setIsUploading(true);
    onBusyChange(true);

    try {
      for (const item of items) {
        if (!mounted.current) break;

        await uploadOne(item, target);
      }
    } finally {
      uploadLock.current = false;

      if (mounted.current) {
        setIsUploading(false);
        onBusyChange(false);
      }
    }
  }

  const selectedNotebook = notebooks.find(
    (notebook) => notebook.id === notebookId,
  );

  const readyItems = materials.filter(
    (material) => !material.error && material.phase === "selected",
  );

  const uploadedCount = materials.filter(
    (material) => material.phase === "uploaded",
  ).length;

  return (
    <section className={styles.panel} aria-labelledby="material-import-title">
      <div
        className={styles.dropzone}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          className={styles.fileInput}
          type="file"
          multiple
          tabIndex={-1}
          aria-label="Choose study materials"
          accept={MATERIAL_INPUT_ACCEPT}
          disabled={isUploading}
          onChange={handleInputChange}
        />

        <span className={styles.uploadIcon}>
          <UploadIcon />
        </span>

        <h2 id="material-import-title">Drop a source here</h2>
        <p>PDF, PNG, JPG, WEBP, TXT, or Markdown up to 50 MB</p>

        <button
          className={styles.chooseButton}
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon />
          Choose files
        </button>

        <small>
          Files stay on your device until you select a notebook and click
          Upload.
        </small>
      </div>

      <div className={styles.uploadControls}>
        <label htmlFor="material-notebook">Save to notebook</label>

        <div className={styles.destinationRow}>
          <select
            id="material-notebook"
            value={notebookId}
            disabled={isUploading || notebooksLoading || !!notebookError}
            onChange={(event) => onNotebookChange(event.target.value)}
          >
            <option value="">
              {notebooksLoading ? "Loading notebooks..." : "Select a notebook"}
            </option>

            {notebooks.map((notebook) => (
              <option key={notebook.id} value={notebook.id}>
                {notebook.title}
              </option>
            ))}
          </select>

          {notebookError ? (
            <button
              className={styles.refreshButton}
              type="button"
              disabled={isUploading || notebooksLoading}
              onClick={onRefreshNotebooks}
            >
              Try again
            </button>
          ) : null}
        </div>

        {notebookError ? (
          <p className={styles.uploadError} role="alert">
            {notebookError}
          </p>
        ) : null}

        {!notebooksLoading && !notebookError && notebooks.length === 0 ? (
          <p className={styles.uploadHelp}>
            Create a notebook from your library, then return here to add files.
          </p>
        ) : null}

        <div className={styles.uploadFooter}>
          <p className={styles.uploadHelp}>
            Uploaded means saved to storage, not processed yet.
          </p>

          <button
            className={styles.chooseButton}
            type="button"
            disabled={
              isUploading ||
              notebooksLoading ||
              !!notebookError ||
              !selectedNotebook ||
              readyItems.length === 0
            }
            onClick={() => {
              if (selectedNotebook) {
                void runUploads(readyItems, selectedNotebook);
              }
            }}
          >
            <UploadIcon />
            {isUploading
              ? "Uploading..."
              : `Upload ${readyItems.length} ${
                  readyItems.length === 1 ? "file" : "files"
                }`}
          </button>
        </div>
      </div>

      <div className={styles.selectionBar}>
        <span role="status">
          {materials.length === 0
            ? "No files selected"
            : `${readyItems.length} ready to upload · ${uploadedCount} uploaded`}
        </span>

        {materials.length > 0 ? (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => setMaterials([])}
          >
            Clear list
          </button>
        ) : null}
      </div>

      {materials.length > 0 ? (
        <>
          <ul className={styles.fileList}>
            {materials.map((material) => (
              <li className={styles.fileRow} key={material.id}>
                <span className={styles.fileIcon}>
                  <FileIcon />
                </span>

                <div className={styles.fileDetails}>
                  <p title={material.file.name}>{material.file.name}</p>

                  <span>
                    {material.kind} · {formatFileSize(material.file.size)}
                  </span>

                  {material.target ? (
                    <span className={styles.destinationName}>
                      Notebook: {material.target.title}
                    </span>
                  ) : null}

                  {!material.error ? (
                    <span
                      className={styles.uploadStatus}
                      data-state={material.phase}
                      role="status"
                    >
                      {phaseLabels[material.phase]}
                    </span>
                  ) : null}

                  {material.phase === "uploading" ||
                  material.phase === "verifying" ? (
                    <div className={styles.uploadProgress}>
                      <progress
                        max={100}
                        value={
                          material.phase === "verifying"
                            ? undefined
                            : (material.uploadProgress ?? undefined)
                        }
                        aria-label={`${
                          material.phase === "verifying"
                            ? "Verifying"
                            : "Uploading"
                        } ${material.file.name}`}
                      />

                      <span>
                        {material.phase === "verifying"
                          ? "Confirming saved file..."
                          : material.uploadProgress === null
                            ? "Transferring file..."
                            : material.uploadProgress === 100
                              ? "Transfer sent. Waiting for storage..."
                              : `${material.uploadProgress}% transferred`}
                      </span>
                    </div>
                  ) : null}

                  {material.error || material.uploadError ? (
                    <strong role="alert">
                      {material.error ?? material.uploadError}
                    </strong>
                  ) : null}
                </div>

                <div className={styles.fileActions}>
                  {material.phase === "error" && material.target ? (
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        if (material.target) {
                          void runUploads([material], material.target);
                        }
                      }}
                    >
                      Retry
                      <span className="sr-only"> {material.file.name}</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => removeMaterial(material.id)}
                  >
                    Remove
                    <span className="sr-only"> {material.file.name}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className={styles.listHelp}>
            You can browse your library while files upload. Keep this browser
            tab open until uploads finish. Removing files from this queue does
            not delete saved documents. The queue resets when you reload the
            page.
          </p>
        </>
      ) : null}
    </section>
  );
}
