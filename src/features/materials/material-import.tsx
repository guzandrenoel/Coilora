"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

import {
  formatFileSize,
  inspectMaterial,
  MATERIAL_INPUT_ACCEPT,
  MaterialSelection,
} from "./material-file";
import styles from "./material-import.module.css";

export function MaterialImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState<MaterialSelection[]>([]);

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).map(inspectMaterial);

    setMaterials((current) => {
      const existingIds = new Set(current.map((material) => material.id));
      const uniqueIncoming = incoming.filter((material) => !existingIds.has(material.id));
      return [...current, ...uniqueIncoming];
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
    setMaterials((current) => current.filter((material) => material.id !== id));
  }

  const validCount = materials.filter((material) => material.error === null).length;

  return (
    <section className={styles.panel} aria-labelledby="material-import-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>Import preparation</p>
          <h2 id="material-import-title">Select study materials</h2>
        </div>
        {materials.length > 0 ? (
          <button className={styles.clearButton} type="button" onClick={() => setMaterials([])}>
            Clear all
          </button>
        ) : null}
      </div>

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
          accept={MATERIAL_INPUT_ACCEPT}
          onChange={handleInputChange}
        />
        <p className={styles.dropTitle}>Drop files here or choose them from your device.</p>
        <p className={styles.dropHelp}>PDF, PNG, JPG, WEBP, TXT, or Markdown · Up to 50 MB each</p>
        <button className={styles.chooseButton} type="button" onClick={() => inputRef.current?.click()}>
          Choose files
        </button>
      </div>

      <p className={styles.privacyNote}>
        Files remain on this device. Secure storage and account uploads will be connected in the
        backend phase.
      </p>

      <p className={styles.selectionSummary} aria-live="polite">
        {materials.length === 0
          ? "No files selected."
          : `${materials.length} selected · ${validCount} ready for a future upload`}
      </p>

      {materials.length > 0 ? (
        <ul className={styles.fileList}>
          {materials.map((material) => (
            <li className={styles.fileRow} key={material.id}>
              <div className={styles.fileDetails}>
                <p>{material.file.name}</p>
                <span>
                  {material.kind} · {formatFileSize(material.file.size)}
                </span>
                {material.error ? <strong>{material.error}</strong> : null}
              </div>
              <button type="button" onClick={() => removeMaterial(material.id)}>
                Remove
                <span className="sr-only"> {material.file.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
