"use client";

import { useState } from "react";
import { coverColors, type CoverColor } from "@/lib/api/types";
import styles from "./notebook-cover.module.css";

export function NotebookCover({
  title,
  color,
  compact = false,
}: {
  title: string;
  color: CoverColor;
  compact?: boolean;
}) {
  return (
    <div
      className={styles.cover}
      data-color={color}
      data-compact={compact}
      aria-hidden="true"
    >
      <div className={styles.book}>
        <span className={styles.rule} />
        <span className={styles.title}>{title || "Your next chapter"}</span>
        <span className={styles.lines}>
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}

export function NotebookAppearance({
  initialTitle = "",
  initialColor = "sage",
  disabled,
}: {
  initialTitle?: string;
  initialColor?: CoverColor;
  disabled: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [color, setColor] = useState<CoverColor>(initialColor);
  return (
    <>
      <NotebookCover title={title} color={color} compact />
      <label htmlFor="collection-name">Notebook title</label>
      <input
        id="collection-name"
        name="name"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        maxLength={160}
        placeholder="e.g. Cardiovascular system"
        disabled={disabled}
      />
      <fieldset className={styles.palette} disabled={disabled}>
        <legend>Cover color</legend>
        <div className={styles.swatches}>
          {coverColors.map((option) => (
            <label key={option} className={styles.swatch} data-color={option}>
              <input
                type="radio"
                name="coverColor"
                value={option}
                checked={color === option}
                onChange={() => setColor(option)}
              />
              <span className={styles.colorChip} aria-hidden="true">
                {color === option ? "✓" : ""}
              </span>
              <span>{option[0].toUpperCase() + option.slice(1)}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
