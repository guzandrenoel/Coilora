"use client";

import { coverColors, type CoverColor } from "@/lib/api/types";
import styles from "./course-color-picker.module.css";

export const courseAccentColors: Record<CoverColor, string> = {
  sage: "#25866a",
  ocean: "#4a78b1",
  lavender: "#8b66b2",
  rose: "#b76383",
  peach: "#b86b36",
  yellow: "#f4cf38",
  slate: "#64788e",
};

export function CourseColorPicker({
  initialColor = "sage",
  disabled = false,
}: {
  initialColor?: CoverColor;
  disabled?: boolean;
}) {
  return (
    <fieldset className={styles.picker} disabled={disabled}>
      <legend>Course color</legend>
      <div className={styles.options}>
        {coverColors.map((color) => (
          <label key={color} className={styles.option}>
            <input
              className={styles.radio}
              type="radio"
              name="courseColor"
              value={color}
              defaultChecked={color === initialColor}
              required
            />
            <span
              className={styles.swatch}
              style={{ backgroundColor: courseAccentColors[color] }}
              aria-hidden="true"
            />
            <span className={styles.label}>
              {color[0].toUpperCase() + color.slice(1)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
