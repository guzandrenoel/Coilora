"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

import { FileIcon, UploadIcon } from "@/components/ui/icons";

import { formatFileSize, inspectMaterial, MATERIAL_INPUT_ACCEPT, MaterialSelection } from "./material-file";
import styles from "./material-import.module.css";

export function MaterialImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState<MaterialSelection[]>([]);

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).map(inspectMaterial);
    setMaterials((current) => {
      const existingIds = new Set(current.map((material) => material.id));
      return [...current, ...incoming.filter((material) => !existingIds.has(material.id))];
    });
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
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
        <span className={styles.uploadIcon}><UploadIcon /></span>
        <h2 id="material-import-title">Drop a source here</h2>
        <p>PDF, PNG, JPG, WEBP, TXT, or Markdown up to 50 MB</p>
        <button className={styles.chooseButton} type="button" onClick={() => inputRef.current?.click()}>
          <UploadIcon />
          Choose files
        </button>
        <small>Files stay on this device until secure uploads are connected.</small>
      </div>

      <div className={styles.selectionBar} aria-live="polite">
        <span>{materials.length === 0 ? "No files selected" : `${validCount} of ${materials.length} ready`}</span>
        {materials.length > 0 ? (
          <button type="button" onClick={() => setMaterials([])}>Clear selection</button>
        ) : null}
      </div>

      {materials.length > 0 ? (
        <ul className={styles.fileList}>
          {materials.map((material) => (
            <li className={styles.fileRow} key={material.id}>
              <span className={styles.fileIcon}><FileIcon /></span>
              <div className={styles.fileDetails}>
                <p>{material.file.name}</p>
                <span>{material.kind} · {formatFileSize(material.file.size)}</span>
                {material.error ? <strong>{material.error}</strong> : null}
              </div>
              <button type="button" onClick={() => removeMaterial(material.id)}>
                Remove<span className="sr-only"> {material.file.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
